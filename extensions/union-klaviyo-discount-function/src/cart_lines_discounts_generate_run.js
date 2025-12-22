import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from '../generated/api';


/**
  * @typedef {import("../generated/api").CartInput} RunInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartLinesDiscountsGenerateRunResult}
  */

export function cartLinesDiscountsGenerateRun(input) {
  console.log('=== DISCOUNT FUNCTION START ===');

  if (!input.cart.lines.length) {
    console.log('No cart lines - returning empty operations');
    return {operations: []};
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasProductDiscountClass) {
    console.log('No applicable discount classes - returning empty operations');
    return {operations: []};
  }

  console.log('Cart lines count:', input.cart.lines.length);

  const eligibleCartLines = [];
  
  input.cart.lines.forEach((line, index) => {
    if (line.merchandise?.__typename === "ProductVariant") {
      const variant = line.merchandise;
      const compareAtPrice = line.cost?.compareAtAmountPerQuantity?.amount;
      const currentPrice = line.cost?.amountPerQuantity?.amount;
      
      console.log(`Line ${index}: Variant ${variant.id}, product: ${variant.product.id}, currentPrice: ${currentPrice}, compareAtPrice: ${compareAtPrice || 'null'}`);
      
      if (compareAtPrice && parseFloat(compareAtPrice) > 0) {
        console.log(`  -> EXCLUDED: Variant has compareAtPrice of ${compareAtPrice}`);
        return;
      }
      
      console.log(`  -> ELIGIBLE: Adding to targets`);
      eligibleCartLines.push(line);
    }
  });

  console.log('Total eligible cart lines found:', eligibleCartLines.length);

  if (eligibleCartLines.length === 0) {
    console.log('No eligible cart lines found - returning empty operations');
    return {operations: []};
  }

  const operations = [];

  // Fixed 20% discount
  const DISCOUNT_PERCENTAGE = 20;
  const discountValue = { 
    percentage: { 
      value: DISCOUNT_PERCENTAGE 
    } 
  };

  console.log('Applying fixed discount:', DISCOUNT_PERCENTAGE + '%');

  if (hasProductDiscountClass) {
    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: `${DISCOUNT_PERCENTAGE}% OFF PRODUCT`,
            targets: eligibleCartLines.map(line => ({
              cartLine: {
                id: line.id,
              },
            })),
            value: discountValue,
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });

    console.log('Added product discount for', eligibleCartLines.length, 'cart lines');
  }

  console.log('=== DISCOUNT FUNCTION END ===');

  return {
    operations,
  };
}