import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { NotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto, createdById: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
    });

    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Ticket', dto.ticketId);
    }

    const payment = await this.prisma.payment.create({
      data: {
        ticketId: dto.ticketId,
        paymentMethod: dto.paymentMethod,
        amount: dto.amount,
        referenceNumber: dto.referenceNumber,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        createdById,
      },
      include: {
        ticket: { select: { id: true, ticketNumber: true, plateNumber: true, totalAmount: true, paymentStatus: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Check if total paid covers the ticket's totalAmount
    if (ticket.totalAmount) {
      const totalPaid = await this.prisma.payment.aggregate({
        where: { ticketId: dto.ticketId },
        _sum: { amount: true },
      });

      const sumPaid = Number(totalPaid._sum.amount ?? 0);
      if (sumPaid >= Number(ticket.totalAmount)) {
        await this.prisma.ticket.update({
          where: { id: dto.ticketId },
          data: { paymentStatus: 'PAID' },
        });
      }
    }

    return payment;
  }

  async findAll(filter: PaymentFilterDto) {
    const { page = 1, limit = 10, ticketId, paymentMethod, dateFrom, dateTo } = filter;

    const where: Prisma.PaymentWhereInput = {};

    if (ticketId) where.ticketId = ticketId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (dateFrom || dateTo) {
      where.paidAt = {};
      if (dateFrom) where.paidAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.paidAt.lte = end;
      }
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          ticket: { select: { id: true, ticketNumber: true, plateNumber: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        ticket: { select: { id: true, ticketNumber: true, plateNumber: true, totalAmount: true, paymentStatus: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!payment) throw new NotFoundException('Payment', id);
    return payment;
  }

  async findByTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.deletedAt) throw new NotFoundException('Ticket', ticketId);

    return this.prisma.payment.findMany({
      where: { ticketId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async getDailyReport(date: string, lotId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const ticketWhere: Prisma.TicketWhereInput = { deletedAt: null };
    if (lotId) ticketWhere.lotId = lotId;

    // Get ticket ids for the lot filter
    let ticketIds: string[] | undefined;
    if (lotId) {
      const tickets = await this.prisma.ticket.findMany({
        where: ticketWhere,
        select: { id: true },
      });
      ticketIds = tickets.map((t) => t.id);
    }

    const paymentWhere: Prisma.PaymentWhereInput = {
      paidAt: { gte: startOfDay, lte: endOfDay },
    };

    if (ticketIds !== undefined) {
      paymentWhere.ticketId = { in: ticketIds };
    }

    const payments = await this.prisma.payment.findMany({
      where: paymentWhere,
      select: { paymentMethod: true, amount: true },
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const paymentCount = payments.length;

    const byMethodMap = new Map<string, { count: number; amount: number }>();
    for (const p of payments) {
      const key = p.paymentMethod;
      const current = byMethodMap.get(key) ?? { count: 0, amount: 0 };
      byMethodMap.set(key, { count: current.count + 1, amount: current.amount + Number(p.amount) });
    }

    const byMethod = Array.from(byMethodMap.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
    }));

    return { date, totalAmount, paymentCount, byMethod };
  }
}
