export interface LineInput {
  productId: string;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  variantAdjustment?: number;
}

export interface CalculatedLine {
  productId: string;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  variantAdjustment: number;
  effectiveUnitPrice: number;
  lineSubtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateCommercialDocument(
  items: LineInput[],
  discountRule?: {
    type: 'fixed' | 'percentage';
    value: number;
    minPurchaseAmount?: number;
    minQuantity?: number;
  } | null,
  taxRate: number = 18.0
): {
  lines: CalculatedLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
} {
  let subtotal = 0;
  let totalQuantity = 0;

  const rawLines = items.map((item) => {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const basePrice = Math.max(0, item.unitPrice || 0);
    const adjustment = item.variantAdjustment || 0;
    const effectiveUnitPrice = round2(basePrice + adjustment);
    const lineSubtotal = round2(effectiveUnitPrice * qty);

    subtotal = round2(subtotal + lineSubtotal);
    totalQuantity += qty;

    return {
      ...item,
      quantity: qty,
      unitPrice: basePrice,
      variantAdjustment: adjustment,
      effectiveUnitPrice,
      lineSubtotal,
    };
  });

  // Calculate overall discount
  let overallDiscount = 0;
  if (discountRule) {
    const minAmount = discountRule.minPurchaseAmount || 0;
    const minQty = discountRule.minQuantity || 1;

    if (subtotal >= minAmount && totalQuantity >= minQty) {
      if (discountRule.type === 'percentage') {
        overallDiscount = round2((subtotal * discountRule.value) / 100);
      } else {
        overallDiscount = round2(Math.min(discountRule.value, subtotal));
      }
    }
  }

  // Allocate discount proportionally across lines and calculate tax
  let allocatedDiscountTotal = 0;
  let totalTax = 0;

  const lines: CalculatedLine[] = rawLines.map((line, idx) => {
    let lineDiscount = 0;
    if (subtotal > 0 && overallDiscount > 0) {
      if (idx === rawLines.length - 1) {
        // Last line absorbs remainder to prevent penny rounding drift
        lineDiscount = round2(overallDiscount - allocatedDiscountTotal);
      } else {
        lineDiscount = round2((line.lineSubtotal / subtotal) * overallDiscount);
        allocatedDiscountTotal = round2(allocatedDiscountTotal + lineDiscount);
      }
    }

    const taxableAmount = Math.max(0, round2(line.lineSubtotal - lineDiscount));
    const lineTax = round2((taxableAmount * taxRate) / 100);
    const lineTotal = round2(taxableAmount + lineTax);

    totalTax = round2(totalTax + lineTax);

    return {
      productId: line.productId,
      variantId: line.variantId || null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      variantAdjustment: line.variantAdjustment,
      effectiveUnitPrice: line.effectiveUnitPrice,
      lineSubtotal: line.lineSubtotal,
      discountAmount: lineDiscount,
      taxableAmount,
      taxRate,
      taxAmount: lineTax,
      lineTotal,
    };
  });

  const grandTotal = round2(subtotal - overallDiscount + totalTax);

  return {
    lines,
    subtotal,
    discountAmount: overallDiscount,
    taxAmount: totalTax,
    grandTotal,
  };
}

export function getNextBillingDate(startDateStr: string, frequency: string): string {
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly': {
      const origDay = d.getDate();
      const currentYear = d.getFullYear();
      const currentMonth = d.getMonth();
      const targetMonth = currentMonth + 1;
      const targetYear = currentYear + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      d.setDate(1);
      d.setFullYear(targetYear);
      d.setMonth(normalizedMonth);
      d.setDate(Math.min(origDay, daysInTargetMonth));
      break;
    }
    case 'yearly': {
      const origDay = d.getDate();
      const origMonth = d.getMonth();
      const targetYear = d.getFullYear() + 1;
      const daysInMonth = new Date(targetYear, origMonth + 1, 0).getDate();
      d.setDate(1);
      d.setFullYear(targetYear);
      d.setMonth(origMonth);
      d.setDate(Math.min(origDay, daysInMonth));
      break;
    }
    default:
      d.setMonth(d.getMonth() + 1);
  }

  return d.toISOString().split('T')[0];
}
