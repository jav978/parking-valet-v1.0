import { Injectable } from '@nestjs/common';
import { Prisma, Rate } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { FareCalculatorService, FareBreakdown } from './fare-calculator.service';
import { ParkingMapGateway } from '../../common/events/parking-map.gateway';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/** Tolerancia para aceptar baseAmount legado enviado por clientes antiguos. */
const BASE_AMOUNT_TOLERANCE = 0.01;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fareCalculator: FareCalculatorService,
    private readonly parkingMapGateway: ParkingMapGateway,
  ) {}

  private savePhotoFile(base64Data: string, prefix: string): string {
    if (!base64Data) return '';
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://') || base64Data.startsWith('/uploads/')) {
      return base64Data;
    }

    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) return base64Data;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    const dir = path.join(process.cwd(), 'uploads', 'tickets');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${prefix}-${uuidv4()}.${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    return `/uploads/tickets/${filename}`;
  }

  async lookupPlate(plateNumber: string) {
    if (!plateNumber || !plateNumber.trim()) {
      return { activeTicket: null, vehicle: null, client: null };
    }

    const cleanPlate = plateNumber.trim().toUpperCase();

    const [activeTicket, vehicle] = await Promise.all([
      this.prisma.ticket.findFirst({
        where: {
          plateNumber: { equals: cleanPlate, mode: 'insensitive' },
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          lot: { select: { id: true, name: true, code: true } },
          spot: { select: { id: true, spotNumber: true, floor: true, section: true } },
        },
      }),
      this.prisma.vehicle.findFirst({
        where: {
          plateNumber: { equals: cleanPlate, mode: 'insensitive' },
          deletedAt: null,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              documentType: true,
              documentNumber: true,
              clientType: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      activeTicket: activeTicket
        ? {
            id: activeTicket.id,
            ticketNumber: activeTicket.ticketNumber,
            entryTime: activeTicket.entryTime,
            spotNumber: activeTicket.spot?.spotNumber || 'N/A',
            floor: activeTicket.spot?.floor || 0,
            lotName: activeTicket.lot?.name || 'Estacionamiento',
          }
        : null,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            brand: vehicle.brand,
            model: vehicle.model,
            color: vehicle.color,
            vehicleType: vehicle.vehicleType,
            clientId: vehicle.clientId,
          }
        : null,
      client: vehicle?.client || null,
    };
  }

  async create(dto: CreateTicketDto, entryOperatorId: string) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id: dto.lotId } });
    if (!lot || lot.deletedAt) throw new NotFoundException('ParkingLot', dto.lotId);

    const cleanPlate = dto.plateNumber.trim().toUpperCase();

    // Validar si el vehículo ya posee un ticket ACTIVO dentro del parqueadero
    const activeTicket = await this.prisma.ticket.findFirst({
      where: {
        plateNumber: { equals: cleanPlate, mode: 'insensitive' },
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        spot: { select: { spotNumber: true } },
        lot: { select: { name: true } },
      },
    });

    if (activeTicket) {
      const spotInfo = activeTicket.spot ? ` en el Puesto ${activeTicket.spot.spotNumber}` : '';
      throw new BusinessException(
        `El vehículo con placa ${cleanPlate} ya se encuentra DENTRO del estacionamiento con el Ticket #${activeTicket.ticketNumber}${spotInfo} (${activeTicket.lot?.name || 'Sucursal'}). No se puede emitir un ticket duplicado.`
      );
    }

    if (dto.spotId) {
      const spot = await this.prisma.parkingSpot.findUnique({ where: { id: dto.spotId } });
      if (!spot) throw new NotFoundException('ParkingSpot', dto.spotId);
      if (spot.status !== 'AVAILABLE') throw new BusinessException('El puesto de estacionamiento seleccionado no está disponible.');
    }

    // Auto-vincular vehículo y cliente registrados si no se proveyeron en el DTO
    let vehicleId = dto.vehicleId;
    let clientId = dto.clientId;

    if (!vehicleId || !clientId) {
      const existingVehicle = await this.prisma.vehicle.findFirst({
        where: { plateNumber: { equals: cleanPlate, mode: 'insensitive' }, deletedAt: null },
      });
      if (existingVehicle) {
        if (!vehicleId) vehicleId = existingVehicle.id;
        if (!clientId && existingVehicle.clientId) clientId = existingVehicle.clientId;
      }
    }

    let savedEntryPhotoUrls: string[] = [];
    if (dto.photos && dto.photos.length > 0) {
      savedEntryPhotoUrls = dto.photos.map((p, idx) => this.savePhotoFile(p, `entry-${idx + 1}`));
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const ticketNumber = await this.generateTicketNumber(tx, dto.lotId);

      if (dto.spotId) {
        await tx.parkingSpot.update({
          where: { id: dto.spotId },
          data: { status: 'OCCUPIED' },
        });
        await tx.parkingLot.update({
          where: { id: dto.lotId },
          data: { availableSpots: { decrement: 1 } },
        });
      }

      const createdTicket = await tx.ticket.create({
        data: {
          ticketNumber,
          lotId: dto.lotId,
          spotId: dto.spotId,
          clientId: clientId,
          vehicleId: vehicleId,
          plateNumber: cleanPlate,
          entryTime: dto.entryTime ? new Date(dto.entryTime) : new Date(),
          entryOperatorId,
          notes: dto.notes,
          entryPhotoUrl: savedEntryPhotoUrls.length > 0 ? savedEntryPhotoUrls[0] : null,
        },
        include: {
          lot: { select: { id: true, name: true, code: true } },
          spot: { select: { id: true, spotNumber: true, floor: true } },
          entryOperator: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (savedEntryPhotoUrls.length > 0) {
        await tx.ticketPhoto.createMany({
          data: savedEntryPhotoUrls.map((url, idx) => ({
            ticketId: createdTicket.id,
            photoUrl: url,
            stage: 'ENTRY' as const,
            caption: `Foto Entrada #${idx + 1}`,
          })),
        });
      }

      return createdTicket;
    });

    // Notificar al mapa en vivo (fuera de la transacción, ya commiteada).
    if (ticket.spotId) await this.parkingMapGateway.emitSpotUpdate(ticket.spotId);

    return this.findOne(ticket.id);
  }

  async findAll(filter: TicketFilterDto) {
    const { page = 1, limit = 10, sortBy = 'entryTime', sortOrder = 'desc', search, lotId, clientId, status, paymentStatus, entryOperatorId } = filter;

    const where: Prisma.TicketWhereInput = { deletedAt: null };

    if (lotId) where.lotId = lotId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (entryOperatorId) where.entryOperatorId = entryOperatorId;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { plateNumber: { contains: search, mode: 'insensitive' } },
        { client: { documentNumber: { contains: search, mode: 'insensitive' } } },
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.TicketOrderByWithRelationInput = {};
    if (sortBy === 'entryTime' || sortBy === 'exitTime' || sortBy === 'createdAt' || sortBy === 'totalAmount') {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.entryTime = sortOrder;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          lot: { select: { id: true, name: true, code: true } },
          spot: { select: { id: true, spotNumber: true } },
          client: { select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true } },
          vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
          entryOperator: { select: { id: true, firstName: true, lastName: true } },
          exitOperator: { select: { id: true, firstName: true, lastName: true } },
          rate: { select: { id: true, name: true } },
          photos: { select: { id: true, photoUrl: true, stage: true, caption: true, createdAt: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        lot: { select: { id: true, name: true, code: true, taxPercentage: true } },
        spot: { select: { id: true, spotNumber: true, floor: true, section: true, spotTypeId: true } },
        client: { select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true } },
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, color: true } },
        rate: true,
        entryOperator: { select: { id: true, firstName: true, lastName: true } },
        exitOperator: { select: { id: true, firstName: true, lastName: true } },
        payments: true,
        accessLogs: { orderBy: { accessTime: 'asc' } },
        entryCashRegister: { select: { id: true, name: true } },
        exitCashRegister: { select: { id: true, name: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket', id);
    return ticket;
  }

  /**
   * Resuelve la tarifa aplicable: explícita → asignada al ticket → activa del lote
   * (filtrada por el tipo de puesto del ticket cuando es posible).
   */
  private async resolveRate(
    ticket: { rateId?: string | null; lotId: string; spot?: { spotTypeId?: string | null } | null },
    rateId?: string,
  ): Promise<Rate | null> {
    if (rateId) {
      const rate = await this.prisma.rate.findFirst({ where: { id: rateId, deletedAt: null, isActive: true } });
      if (!rate) throw new BusinessException('La tarifa seleccionada no existe o está inactiva.');
      return rate;
    }
    if (ticket.rateId) {
      const rate = await this.prisma.rate.findFirst({ where: { id: ticket.rateId, deletedAt: null, isActive: true } });
      if (rate) return rate;
    }
    const spotTypeId = ticket.spot?.spotTypeId ?? null;
    const where: Prisma.RateWhereInput = {
      lotId: ticket.lotId,
      isActive: true,
      deletedAt: null,
      ...(spotTypeId ? { spotTypeId } : {}),
    };
    return this.prisma.rate.findFirst({ where, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Vista previa del cobro: calcula la tarifa en el servidor para que el operador
   * vea el desglose exacto antes de cerrar. No muta nada.
   */
  async quote(id: string, rateId?: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        lot: { select: { id: true, taxPercentage: true, name: true } },
        spot: { select: { id: true, spotTypeId: true, spotNumber: true } },
        rate: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket', id);
    if (ticket.status !== 'ACTIVE') {
      throw new BusinessException('Solo se puede cotizar un ticket activo.');
    }

    const rate = await this.resolveRate(
      { rateId: ticket.rateId, lotId: ticket.lotId, spot: ticket.spot },
      rateId,
    );
    if (!rate) {
      throw new BusinessException(
        'No hay tarifa activa configurada para este lote. Configure una tarifa en el módulo de Tarifas antes de cerrar el ticket.',
      );
    }

    const now = new Date();
    const durationMinutes = Math.max(0, Math.round((now.getTime() - ticket.entryTime.getTime()) / 60000));
    const breakdown = this.fareCalculator.calculate(rate, durationMinutes);

    const taxRate = Number(ticket.lot.taxPercentage) / 100;
    const taxable = breakdown.subtotal;
    const tax = taxable * taxRate;
    const total = taxable + tax;

    return {
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        plateNumber: ticket.plateNumber,
        entryTime: ticket.entryTime,
        lotName: ticket.lot.name,
        spotNumber: ticket.spot?.spotNumber ?? null,
      },
      breakdown,
      taxRatePercent: Number(ticket.lot.taxPercentage),
      taxAmount: this.fareCalculator.round2(tax),
      total: this.fareCalculator.round2(total),
      calculatedAt: now.toISOString(),
    };
  }

  async close(id: string, dto: CloseTicketDto, exitOperatorId: string) {
    const ticket = await this.findOne(id);

    if (ticket.status !== 'ACTIVE') {
      throw new BusinessException('Ticket is not active');
    }

    const exitTime = dto.exitTime ? new Date(dto.exitTime) : new Date();
    const durationMinutes = Math.round((exitTime.getTime() - ticket.entryTime.getTime()) / 60000);
    if (durationMinutes < 0) {
      throw new BusinessException('Exit time cannot be before entry time');
    }

    // ─── Cálculo de tarifa EN EL SERVIDOR (anti-fraude) ───
    const rate = await this.resolveRate(
      { rateId: ticket.rateId, lotId: ticket.lotId, spot: ticket.spot },
      dto.rateId,
    );
    if (!rate) {
      throw new BusinessException(
        'No hay tarifa activa configurada para este lote. Configure una tarifa antes de cerrar el ticket.',
      );
    }
    const breakdown = this.fareCalculator.calculate(rate, durationMinutes);
    const serverBaseAmount = breakdown.subtotal;

    // Rechazar montos que no provengan del cálculo del servidor (tolerancia por redondeo).
    if (dto.baseAmount !== undefined && Math.abs(Number(dto.baseAmount) - serverBaseAmount) > BASE_AMOUNT_TOLERANCE) {
      throw new BusinessException(
        `El monto enviado (${Number(dto.baseAmount).toFixed(2)}) no coincide con la tarifa calculada por el sistema (${serverBaseAmount.toFixed(2)}) para ${breakdown.billedUnits} ${breakdown.unitLabel} con la tarifa "${rate.name}". Utilice el monto calculado; para ajustar el cobro aplique un descuento.`,
      );
    }

    const updateData: Prisma.TicketUpdateInput = {
      exitTime,
      durationMinutes,
      exitOperator: { connect: { id: exitOperatorId } },
      status: 'COMPLETED',
      rate: { connect: { id: rate.id } },
    };

    if (dto.exitCashRegisterId) {
      updateData.exitCashRegister = { connect: { id: dto.exitCashRegisterId } };
    } else {
      const activeRegister = await this.prisma.cashRegister.findFirst({
        where: {
          lotId: ticket.lotId,
          status: 'OPEN',
          deletedAt: null,
        },
        orderBy: { openedAt: 'desc' },
      });
      if (activeRegister) {
        updateData.exitCashRegister = { connect: { id: activeRegister.id } };
      }
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Desglose calculado en servidor: base → descuento → penalidad → impuesto → total.
    const discount = dto.discountAmount ?? 0;
    if (discount > serverBaseAmount) {
      throw new BusinessException(
        `El descuento ($${discount.toFixed(2)}) no puede superar el monto de la tarifa ($${serverBaseAmount.toFixed(2)}).`,
      );
    }
    updateData.baseAmount = serverBaseAmount;
    updateData.discountAmount = discount;

    const isLost = dto.isLostTicket ?? false;
    const penalty = isLost ? (dto.penaltyAmount ?? (serverBaseAmount * 0.30)) : 0;
    updateData.isLostTicket = isLost;
    updateData.penaltyAmount = penalty;

    const taxRate = Number(ticket.lot.taxPercentage) / 100;
    const taxableAmount = serverBaseAmount - discount + penalty;
    const tax = taxableAmount * taxRate;
    updateData.taxAmount = tax;
    updateData.totalAmount = taxableAmount + tax;

    let savedExitPhotoUrls: string[] = [];
    if (dto.photos && dto.photos.length > 0) {
      savedExitPhotoUrls = dto.photos.map((p, idx) => this.savePhotoFile(p, `exit-${id}-${idx + 1}`));
    }

    // ─── Pago integrado ("Cobrar y Salir") dentro de la misma transacción ───
    const totalDue = taxableAmount + tax;
    const exitCashRegisterId = (updateData.exitCashRegister as { connect?: { id: string } })?.connect?.id ?? null;

    await this.prisma.$transaction(async (tx) => {
      if (ticket.spotId) {
        await tx.parkingSpot.update({
          where: { id: ticket.spotId },
          data: { status: 'AVAILABLE' },
        });
        await tx.parkingLot.update({
          where: { id: ticket.lotId },
          data: { availableSpots: { increment: 1 } },
        });
      }

      await tx.ticket.update({
        where: { id },
        data: updateData,
      });

      if (savedExitPhotoUrls.length > 0) {
        await tx.ticketPhoto.createMany({
          data: savedExitPhotoUrls.map((url, idx) => ({
            ticketId: id,
            photoUrl: url,
            stage: 'EXIT' as const,
            caption: `Foto Salida #${idx + 1}`,
          })),
        });
      }

      if (dto.payment) {
        const amount = Number(dto.payment.amount);
        if (amount > totalDue + BASE_AMOUNT_TOLERANCE) {
          throw new BusinessException(
            `El monto del pago ($${amount.toFixed(2)}) excede el total a cobrar ($${totalDue.toFixed(2)}).`,
          );
        }
        if (amount <= 0) {
          throw new BusinessException('El monto del pago debe ser mayor a cero.');
        }
        if (dto.payment.paymentMethod !== 'CASH' && !dto.payment.referenceNumber) {
          throw new BusinessException('Los pagos con tarjeta o transferencia requieren un número de referencia.');
        }

        await tx.payment.create({
          data: {
            ticketId: id,
            paymentMethod: dto.payment.paymentMethod,
            amount,
            referenceNumber: dto.payment.referenceNumber,
            createdById: exitOperatorId,
          },
        });

        updateData.paymentStatus = amount >= totalDue - BASE_AMOUNT_TOLERANCE ? 'PAID' : 'PENDING';
        await tx.ticket.update({
          where: { id },
          data: { paymentStatus: updateData.paymentStatus },
        });

        // Movimiento de caja asociado al cobro (si hay caja abierta asignada a la salida).
        if (exitCashRegisterId) {
          await tx.cashRegisterMovement.create({
            data: {
              cashRegisterId: exitCashRegisterId,
              type: 'INCOME',
              amount,
              referenceNumber: dto.payment.referenceNumber,
              description: `Cobro Ticket #${ticket.ticketNumber} (${dto.payment.paymentMethod})`,
              createdById: exitOperatorId,
            },
          });
        }
      } else {
        updateData.paymentStatus = 'PENDING';
      }
    });

    if (ticket.spotId) await this.parkingMapGateway.emitSpotUpdate(ticket.spotId);

    return this.findOne(id);
  }

  async cancel(id: string, dto: CancelTicketDto) {
    const ticket = await this.findOne(id);

    if (ticket.status === 'CANCELLED') {
      throw new BusinessException('Ticket is already cancelled');
    }
    if (ticket.status === 'COMPLETED') {
      throw new BusinessException('Cannot cancel a completed ticket');
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      if (ticket.spotId) {
        await tx.parkingSpot.update({
          where: { id: ticket.spotId },
          data: { status: 'AVAILABLE' },
        });
        await tx.parkingLot.update({
          where: { id: ticket.lotId },
          data: { availableSpots: { increment: 1 } },
        });
      }

      return tx.ticket.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: dto.cancelReason,
        },
      });
    });

    if (ticket.spotId) await this.parkingMapGateway.emitSpotUpdate(ticket.spotId);
    return cancelled;
  }
  async getActiveByLot(lotId: string) {
    return this.prisma.ticket.findMany({
      where: { lotId, status: 'ACTIVE', deletedAt: null },
      include: {
        spot: { select: { id: true, spotNumber: true } },
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { entryTime: 'desc' },
    });
  }

  private async generateTicketNumber(
    tx: Prisma.TransactionClient,
    lotId: string,
  ): Promise<string> {
    // Incremento ATÓMICO: el UPDATE bloquea la fila del lote, por lo que dos
    // creaciones concurrentes nunca obtienen el mismo número (antes era
    // read-then-update y producía números duplicados en horas pico).
    const rows = await tx.$queryRaw<
      Array<{ ticket_prefix: string | null; code: string | null; ticket_next_num: number }>
    >`UPDATE "parking_lots" SET "ticket_next_num" = "ticket_next_num" + 1 WHERE "id" = ${lotId}::uuid RETURNING "ticket_prefix", "code", "ticket_next_num"`;

    if (!rows || rows.length === 0) throw new NotFoundException('ParkingLot', lotId);

    const row = rows[0];
    const prefix = row.ticket_prefix || row.code || 'TKT';
    // El número asignado es el valor ANTERIOR al incremento.
    const nextNum = row.ticket_next_num - 1;

    return `${prefix}-${String(nextNum).padStart(6, '0')}`;
  }
}
