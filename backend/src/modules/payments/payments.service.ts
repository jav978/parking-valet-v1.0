import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { Prisma, TicketStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
      include: { payments: true },
    });

    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('No se puede registrar un pago de un ticket cancelado');
    }

    if (ticket.status === TicketStatus.COMPLETED && ticket.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Este ticket ya está pagado y cerrado');
    }

    const totalPaid = ticket.payments
      .filter(p => !p.deletedAt)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalDue = Number(ticket.totalAmount || 0) - totalPaid;

    if (dto.amount > totalDue) {
      throw new BadRequestException(`El monto excede el saldo pendiente. Debe: $${totalDue.toFixed(2)}`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        ticketId: dto.ticketId,
        paymentMethod: dto.paymentMethod,
        amount: dto.amount,
        referenceNumber: dto.referenceNumber,
        createdById: userId,
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            plateNumber: true,
            totalAmount: true,
            paymentStatus: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const newTotalPaid = totalPaid + dto.amount;
    const ticketAmount = Number(ticket.totalAmount || 0);

    let newPaymentStatus: PaymentStatus;
    if (newTotalPaid >= ticketAmount) {
      newPaymentStatus = PaymentStatus.PAID;
    } else {
      newPaymentStatus = PaymentStatus.PENDING;
    }

    await this.prisma.ticket.update({
      where: { id: dto.ticketId },
      data: { paymentStatus: newPaymentStatus },
    });

    return payment;
  }

  async findAll(filter: PaymentFilterDto) {
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(filter.ticketId && { ticketId: filter.ticketId }),
      ...(filter.paymentMethod && { paymentMethod: filter.paymentMethod }),
      ...(filter.ticketNumber && {
        ticket: { ticketNumber: filter.ticketNumber },
      }),
      ...(filter.dateFrom || filter.dateTo
        ? {
            paidAt: {
              ...(filter.dateFrom && { gte: new Date(filter.dateFrom) }),
              ...(filter.dateTo && { lte: new Date(filter.dateTo) }),
            },
          }
        : {}),
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              plateNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data: payments, total, limit, offset };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id, deletedAt: null },
      include: {
        ticket: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  async findByTicket(ticketId: string) {
    return this.prisma.payment.findMany({
      where: { ticketId, deletedAt: null },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { paidAt: 'asc' },
    });
  }

  async remove(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { ticket: true },
    });

    if (!payment || payment.deletedAt) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.ticket.status === TicketStatus.COMPLETED) {
      throw new BadRequestException('No se puede anular un pago de un ticket ya cerrado');
    }

    await this.prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const ticketPayments = await this.prisma.payment.findMany({
      where: { ticketId: payment.ticketId, deletedAt: null },
    });

    const totalPaid = ticketPayments
      .filter(p => p.id !== id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    await this.prisma.ticket.update({
      where: { id: payment.ticketId },
      data: { paymentStatus: PaymentStatus.PENDING },
    });

    return { message: 'Pago anulado exitosamente' };
  }
}
