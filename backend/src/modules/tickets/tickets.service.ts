import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, entryOperatorId: string) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id: dto.lotId } });
    if (!lot) throw new NotFoundException('ParkingLot', dto.lotId);

    const ticketNumber = await this.generateTicketNumber(dto.lotId);

    if (dto.spotId) {
      const spot = await this.prisma.parkingSpot.findUnique({ where: { id: dto.spotId } });
      if (!spot) throw new NotFoundException('ParkingSpot', dto.spotId);
      if (spot.status !== 'AVAILABLE') throw new BusinessException('Parking spot is not available');
    }

    const [ticket] = await this.prisma.$transaction(async (tx) => {
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

      const created = await tx.ticket.create({
        data: {
          ticketNumber,
          lotId: dto.lotId,
          spotId: dto.spotId,
          clientId: dto.clientId,
          vehicleId: dto.vehicleId,
          plateNumber: dto.plateNumber,
          entryTime: dto.entryTime ? new Date(dto.entryTime) : new Date(),
          entryOperatorId,
          notes: dto.notes,
        },
        include: {
          lot: { select: { id: true, name: true, code: true } },
          spot: { select: { id: true, spotNumber: true, floor: true } },
          entryOperator: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return [created];
    });

    return ticket;
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
          client: { select: { id: true, firstName: true, lastName: true } },
          vehicle: { select: { id: true, plateNumber: true } },
          entryOperator: { select: { id: true, firstName: true, lastName: true } },
          exitOperator: { select: { id: true, firstName: true, lastName: true } },
          rate: { select: { id: true, name: true } },
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
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        lot: { select: { id: true, name: true, code: true, taxPercentage: true } },
        spot: { select: { id: true, spotNumber: true, floor: true, section: true } },
        client: { select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true } },
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, color: true } },
        rate: true,
        entryOperator: { select: { id: true, firstName: true, lastName: true } },
        exitOperator: { select: { id: true, firstName: true, lastName: true } },
        payments: true,
        accessLogs: { orderBy: { accessTime: 'asc' } },
        entryCashRegister: { select: { id: true, name: true } },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket', id);
    return ticket;
  }

  async close(id: string, dto: CloseTicketDto, exitOperatorId: string) {
    const ticket = await this.findOne(id);

    if (ticket.status !== 'ACTIVE') {
      throw new BusinessException('Ticket is not active');
    }

    const exitTime = dto.exitTime ? new Date(dto.exitTime) : new Date();
    const durationMinutes = Math.round((exitTime.getTime() - ticket.entryTime.getTime()) / 60000);

    const updateData: Prisma.TicketUpdateInput = {
      exitTime,
      durationMinutes,
      exitOperator: { connect: { id: exitOperatorId } },
      status: 'COMPLETED',
    };

    if (dto.rateId) updateData.rate = { connect: { id: dto.rateId } };
    if (dto.exitCashRegisterId) updateData.entryCashRegister = { connect: { id: dto.exitCashRegisterId } };
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.baseAmount !== undefined) {
      updateData.baseAmount = dto.baseAmount;
      const discount = dto.discountAmount ?? 0;
      updateData.discountAmount = discount;

      const taxRate = Number(ticket.lot.taxPercentage) / 100;
      const taxableAmount = dto.baseAmount - discount;
      const tax = taxableAmount * taxRate;
      updateData.taxAmount = tax;
      updateData.totalAmount = taxableAmount + tax;
      updateData.paymentStatus = 'PENDING';
    }

    if (ticket.spotId) {
      await this.prisma.parkingSpot.update({
        where: { id: ticket.spotId },
        data: { status: 'AVAILABLE' },
      });
      await this.prisma.parkingLot.update({
        where: { id: ticket.lotId },
        data: { availableSpots: { increment: 1 } },
      });
    }

    return this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        lot: { select: { id: true, name: true, code: true } },
        spot: { select: { id: true, spotNumber: true } },
        rate: { select: { id: true, name: true } },
        entryOperator: { select: { id: true, firstName: true, lastName: true } },
        exitOperator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async cancel(id: string, dto: CancelTicketDto) {
    const ticket = await this.findOne(id);

    if (ticket.status === 'CANCELLED') {
      throw new BusinessException('Ticket is already cancelled');
    }
    if (ticket.status === 'COMPLETED') {
      throw new BusinessException('Cannot cancel a completed ticket');
    }

    if (ticket.spotId) {
      await this.prisma.parkingSpot.update({
        where: { id: ticket.spotId },
        data: { status: 'AVAILABLE' },
      });
      await this.prisma.parkingLot.update({
        where: { id: ticket.lotId },
        data: { availableSpots: { increment: 1 } },
      });
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason,
        exitTime: new Date(),
      },
    });
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

  private async generateTicketNumber(lotId: string): Promise<string> {
    const lot = await this.prisma.parkingLot.findUnique({
      where: { id: lotId },
      select: { ticketPrefix: true, ticketNextNum: true, code: true },
    });

    if (!lot) throw new NotFoundException('ParkingLot', lotId);

    const prefix = lot.ticketPrefix || lot.code || 'TKT';
    const nextNum = lot.ticketNextNum ?? 1;

    await this.prisma.parkingLot.update({
      where: { id: lotId },
      data: { ticketNextNum: nextNum + 1 },
    });

    return `${prefix}-${String(nextNum).padStart(6, '0')}`;
  }
}
