import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CreateCashMovementDto } from './dto/create-movement.dto';
import { CashRegisterFilterDto } from './dto/cash-register-filter.dto';
import { Prisma, CashRegisterStatus } from '@prisma/client';

@Injectable()
export class CashRegistersService {
  constructor(private readonly prisma: PrismaService) {}

  async open(userId: string, dto: OpenCashRegisterDto) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id: dto.lotId } });
    if (!lot || lot.deletedAt) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }

    // Verificar si ya hay una caja abierta en esta sucursal
    const existingOpen = await this.prisma.cashRegister.findFirst({
      where: {
        lotId: dto.lotId,
        status: CashRegisterStatus.OPEN,
        deletedAt: null,
      },
    });

    if (existingOpen) {
      throw new BadRequestException(`Ya existe una caja abierta ("${existingOpen.name}") en este estacionamiento.`);
    }

    return this.prisma.cashRegister.create({
      data: {
        lotId: dto.lotId,
        name: dto.name,
        openedById: userId,
        openingBalance: dto.openingBalance,
        status: CashRegisterStatus.OPEN,
        notes: dto.notes,
      },
      include: {
        lot: true,
        openedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async close(id: string, userId: string, dto: CloseCashRegisterDto) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        movements: true,
        ticketsExit: {
          where: { paymentStatus: 'PAID' },
        },
      },
    });

    if (!register || register.deletedAt) {
      throw new NotFoundException(`Caja con ID ${id} no encontrada`);
    }

    if (register.status === CashRegisterStatus.CLOSED) {
      throw new BadRequestException('Esta caja ya se encuentra cerrada.');
    }

    // Calcular balance esperado: Inicial + Ingresos - Egresos + Pagos de Tickets
    const opening = Number(register.openingBalance);
    const totalIncomes = register.movements
      .filter(m => m.type === 'INCOME')
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const totalExpenses = register.movements
      .filter(m => m.type === 'EXPENSE')
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const ticketPayments = register.ticketsExit
      .reduce((acc, t) => acc + Number(t.totalAmount || 0), 0);

    const expectedBalance = opening + totalIncomes - totalExpenses + ticketPayments;
    const closingBalance = dto.closingBalance;
    const difference = closingBalance - expectedBalance;

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        closingBalance,
        expectedBalance,
        difference,
        status: CashRegisterStatus.CLOSED,
        closedById: userId,
        closedAt: new Date(),
        notes: dto.notes ? `${register.notes ? register.notes + ' | ' : ''}Cierre: ${dto.notes}` : register.notes,
      },
      include: {
        lot: true,
        openedBy: { select: { id: true, firstName: true, lastName: true } },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
        movements: true,
      },
    });
  }

  async findActive(userId: string, lotId?: string) {
    const where: Prisma.CashRegisterWhereInput = {
      status: CashRegisterStatus.OPEN,
      deletedAt: null,
    };

    if (lotId) {
      where.lotId = lotId;
    } else if (userId) {
      where.openedById = userId;
    }

    const active = await this.prisma.cashRegister.findFirst({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        lot: true,
        openedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { firstName: true, lastName: true } } },
        },
        ticketsExit: {
          where: { paymentStatus: 'PAID' },
          select: { id: true, ticketNumber: true, totalAmount: true, exitTime: true },
        },
      },
    });

    if (!active) return null;

    // Calcular balance en tiempo real
    const opening = Number(active.openingBalance);
    const totalIncomes = active.movements
      .filter(m => m.type === 'INCOME')
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const totalExpenses = active.movements
      .filter(m => m.type === 'EXPENSE')
      .reduce((acc, m) => acc + Number(m.amount), 0);

    const ticketPayments = active.ticketsExit
      .reduce((acc, t) => acc + Number(t.totalAmount || 0), 0);

    const currentExpectedBalance = opening + totalIncomes - totalExpenses + ticketPayments;

    return {
      ...active,
      currentSummary: {
        openingBalance: opening,
        totalIncomes,
        totalExpenses,
        ticketPayments,
        expectedBalance: currentExpectedBalance,
      },
    };
  }

  async findAll(filter: CashRegisterFilterDto) {
    const { page = 1, limit = 10, sortBy = 'openedAt', sortOrder = 'desc', lotId, status, openedById, search } = filter;

    const where: Prisma.CashRegisterWhereInput = { deletedAt: null };

    if (lotId) where.lotId = lotId;
    if (status) where.status = status;
    if (openedById) where.openedById = openedById;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lot: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.cashRegister.count({ where }),
      this.prisma.cashRegister.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lot: true,
          openedBy: { select: { id: true, firstName: true, lastName: true } },
          closedBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { movements: true, ticketsExit: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        lot: true,
        openedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        closedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { firstName: true, lastName: true } } },
        },
        ticketsExit: {
          orderBy: { exitTime: 'desc' },
          take: 50,
          select: {
            id: true,
            ticketNumber: true,
            plateNumber: true,
            totalAmount: true,
            exitTime: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!register || register.deletedAt) {
      throw new NotFoundException(`Caja con ID ${id} no encontrada`);
    }

    return register;
  }

  async createMovement(id: string, userId: string, dto: CreateCashMovementDto) {
    const register = await this.prisma.cashRegister.findUnique({ where: { id } });

    if (!register || register.deletedAt) {
      throw new NotFoundException(`Caja con ID ${id} no encontrada`);
    }

    if (register.status === CashRegisterStatus.CLOSED) {
      throw new BadRequestException('No se pueden agregar movimientos a una caja cerrada.');
    }

    return this.prisma.cashRegisterMovement.create({
      data: {
        cashRegisterId: id,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        referenceNumber: dto.referenceNumber,
        createdById: userId,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
