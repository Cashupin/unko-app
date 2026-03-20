/**
 * Settlement Algorithm — Fase 4+
 *
 * Dado un conjunto de gastos y pagos realizados, calcula el mínimo número
 * de transferencias para que todos los participantes queden al día.
 *
 * Se calcula por moneda por separado, ya que no tenemos tasas de cambio.
 */

export interface ParticipantBalance {
  participantId: string;
  name: string;
  paid: number;   // total que pagó
  owes: number;   // total que debe
  balance: number; // paid - owes (positivo = le deben; negativo = debe)
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  currency: string;
}

export interface ExpenseForSettlement {
  id: string;
  amount: number;
  currency: string;
  paidByParticipantId: string | null;
  participants: {
    participantId: string;
    amount: number;
  }[];
}

export interface PaymentForSettlement {
  id: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  currency: string;
}

export interface ParticipantForSettlement {
  id: string;
  name: string;
}

/**
 * Calculates balances and minimum transactions per currency,
 * taking into account payments already made.
 */
export function calculateSettlement(
  expenses: ExpenseForSettlement[],
  participants: ParticipantForSettlement[],
  payments: PaymentForSettlement[] = []
): {
  balances: Record<string, ParticipantBalance[]>; // keyed by currency
  settlements: Settlement[];
  currencies: string[];
} {
  // Collect all currencies used (from expenses AND payments)
  const currencies = [...new Set([
    ...expenses.map((e) => e.currency),
    ...payments.map((p) => p.currency),
  ])];
  const balancesPerCurrency: Record<string, ParticipantBalance[]> = {};
  const allSettlements: Settlement[] = [];

  for (const currency of currencies) {
    // Initialize balance map for this currency
    const balanceMap = new Map<string, ParticipantBalance>();
    for (const p of participants) {
      balanceMap.set(p.id, { participantId: p.id, name: p.name, paid: 0, owes: 0, balance: 0 });
    }

    // Process expenses for this currency
    for (const expense of expenses.filter((e) => e.currency === currency)) {
      // Credit the payer
      if (expense.paidByParticipantId) {
        const payer = balanceMap.get(expense.paidByParticipantId);
        if (payer) {
          payer.paid += expense.amount;
          payer.balance += expense.amount;
        }
      }

      // Debit each included participant
      for (const ep of expense.participants) {
        const p = balanceMap.get(ep.participantId);
        if (p) {
          p.owes += ep.amount;
          p.balance -= ep.amount;
        }
      }
    }

    // Apply payments: a payment from A to B means A's debt decreases and B's credit decreases
    for (const payment of payments.filter((p) => p.currency === currency)) {
      const from = balanceMap.get(payment.fromParticipantId);
      const to = balanceMap.get(payment.toParticipantId);
      if (from) {
        from.balance += payment.amount; // debt reduced
      }
      if (to) {
        to.balance -= payment.amount; // credit reduced
      }
    }

    const balances = [...balanceMap.values()];
    balancesPerCurrency[currency] = balances;

    // Minimum transactions algorithm (greedy)
    const creditors = balances
      .filter((b) => b.balance > 0.005)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.balance - a.balance);

    const debtors = balances
      .filter((b) => b.balance < -0.005)
      .map((b) => ({ ...b }))
      .sort((a, b) => a.balance - b.balance); // most negative first

    let ci = 0;
    let di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci];
      const debtor = debtors[di];
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

      if (amount > 0.005) {
        allSettlements.push({
          fromId: debtor.participantId,
          fromName: debtor.name,
          toId: creditor.participantId,
          toName: creditor.name,
          amount: Math.round(amount * 100) / 100,
          currency,
        });
      }

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance < 0.005) ci++;
      if (Math.abs(debtor.balance) < 0.005) di++;
    }
  }

  return {
    balances: balancesPerCurrency,
    settlements: allSettlements,
    currencies,
  };
}
