import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { AddMovementDto } from './dto/add-movement.dto';
import { CashRegisterFilterDto } from './dto/cash-register-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async open(dto: OpenCashRegisterDto, openedById: string) {
    const existingOpen = await this.prisma.cashRegister.findFirst({
      where: { openedById, status: 'OPEN' },
    });

    if (existingOpen) {
      throw new BusinessException('The operator already has an open cash register');
    }

    return this.prisma.cashRegister.create({
      data: {
        lotId: dto.lotId,
        name: dto.name,
        openedById,
        openingBalance: dto.openingBalance ?? 0,
        notes: dto.notes,
        status: 'OPEN',
        openedAt: new Date(),
      },
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async close(id: string, dto: CloseCashRegisterDto, closedById: string) {
    const cashRegister = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: { movements: true },
    });

    if (!cashRegister) throw new NotFoundException('CashRegister', id);

    if (cashRegister.status === 'CLOSED') {
      throw new BusinessException('Cash register is already closed');
    }

    const totalIncome = cashRegister.movements
      .filter((m) => m.type === 'INCOME')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalExpense = cashRegister.movements
      .filter((m) => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const expectedBalance = Number(cashRegister.openingBalance) + totalIncome - totalExpense;
    const difference = dto.closingBalance - expectedBalance;

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        closedById,
        closingBalance: dto.closingBalance,
        expectedBalance,
        difference,
        status: 'CLOSED',
        closedAt: new Date(),
        notes: dto.notes !== undefined ? dto.notes : cashRegister.notes,
      },
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true } },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(filter: CashRegisterFilterDto) {
    const { page = 1, limit = 10, lotId, status } = filter;

    const where: Prisma.CashRegisterWhereInput = {};

    if (lotId) where.lotId = lotId;
    if (status) where.status = status;

    const [cashRegisters, total] = await Promise.all([
      this.prisma.cashRegister.findMany({
        where,
        include: {
          openedBy: { select: { id: true, firstName: true, lastName: true } },
          closedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.cashRegister.count({ where }),
    ]);

    return {
      data: cashRegisters,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const cashRegister = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true } },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
        movements: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cashRegister) throw new NotFoundException('CashRegister', id);
    return cashRegister;
  }

  async findOpen(lotId?: string) {
    const where: Prisma.CashRegisterWhereInput = { status: 'OPEN' };
    if (lotId) where.lotId = lotId;

    return this.prisma.cashRegister.findMany({
      where,
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async addMovement(id: string, dto: AddMovementDto, userId: string) {
    const cashRegister = await this.prisma.cashRegister.findUnique({ where: { id } });

    if (!cashRegister) throw new NotFoundException('CashRegister', id);

    if (cashRegister.status === 'CLOSED') {
      throw new BusinessException('Cannot add movement to a closed cash register');
    }

    return this.prisma.cashRegisterMovement.create({
      data: {
        cashRegisterId: id,
        type: dto.type,
        amount: dto.amount,
        referenceNumber: dto.referenceNumber,
        description: dto.description,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getMovements(id: string) {
    const cashRegister = await this.prisma.cashRegister.findUnique({ where: { id } });
    if (!cashRegister) throw new NotFoundException('CashRegister', id);

    return this.prisma.cashRegisterMovement.findMany({
      where: { cashRegisterId: id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary(id: string) {
    const cashRegister = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: { movements: true },
    });

    if (!cashRegister) throw new NotFoundException('CashRegister', id);

    const totalIncome = cashRegister.movements
      .filter((m) => m.type === 'INCOME')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalExpense = cashRegister.movements
      .filter((m) => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const currentBalance = Number(cashRegister.openingBalance) + totalIncome - totalExpense;

    const tickets = await this.prisma.ticket.findMany({
      where: { entryCashRegisterId: id, deletedAt: null },
      select: { totalAmount: true },
    });

    const ticketsCount = tickets.length;
    const ticketsRevenue = tickets.reduce((sum, t) => sum + Number(t.totalAmount ?? 0), 0);

    return {
      id: cashRegister.id,
      name: cashRegister.name,
      status: cashRegister.status,
      openingBalance: Number(cashRegister.openingBalance),
      totalIncome,
      totalExpense,
      currentBalance,
      ticketsCount,
      ticketsRevenue,
    };
  }
}
