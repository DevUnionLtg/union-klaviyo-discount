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

  const configuration = parseConfiguration(input.discount.metafield?.value);
  console.log('Configuration:', configuration);

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

      if (configuration.productIds && configuration.productIds.length > 0) {
        if (!configuration.productIds.includes(variant.product.id)) {
          console.log(`  -> EXCLUDED: Product ${variant.product.id} not in configured product IDs`);
          return;
        }
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

  const discountValue = configuration.discountType === 'percentage'
    ? { percentage: { value: configuration.discountValue } }
    : { fixedAmount: { amount: configuration.discountValue } };

  const discountMessage = configuration.discountType === 'percentage'
    ? `${configuration.discountValue}% OFF PRODUCT`
    : `$${configuration.discountValue} OFF PRODUCT`;

  console.log('Applying discount:', discountMessage);

  if (hasProductDiscountClass) {
    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: discountMessage,
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

function parseConfiguration(metafieldValue) {
  const defaultConfig = {
    discountType: 'percentage',
    discountValue: 20,
    productIds: [],
    collections: []
  };

  if (!metafieldValue) {
    return defaultConfig;
  }

  try {
    const parsed = JSON.parse(metafieldValue);
    const discountType = parsed.percentage ? 'percentage' : 'amount';
    const discountValue = parsed.percentage || parsed.amount || 20;
    
    const productIds = parsed.productIds 
      ? parsed.productIds.split(',').map(id => id.trim()).filter(id => id)
      : [];
    
    return {
      discountType,
      discountValue,
      productIds,
      collections: parsed.collections || []
    };
  } catch (error) {
    console.error('Error parsing metafield configuration:', error);
    return defaultConfig;
  }
}