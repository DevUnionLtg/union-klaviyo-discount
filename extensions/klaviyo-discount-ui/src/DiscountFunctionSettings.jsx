import {
  reactExtension,
  useApi,
  BlockStack,
  FunctionSettings,
  Section,
  Text,
  Form,
  NumberField,
  Heading,
  Select,
  TextField,
  Button,
  InlineStack,
  Link,
  Icon,
  Box,
} from "@shopify/ui-extensions-react/admin";
import { useState, useCallback, useEffect } from "react";

const TARGET = "admin.discount-details.function-settings.render";

export default reactExtension(TARGET, async (api) => {
  const existingDefinition = await getMetafieldDefinition(api.query);
  if (!existingDefinition) {
    const metafieldDefinition = await createMetafieldDefinition(api.query);

    if (!metafieldDefinition) {
      throw new Error("Failed to create metafield definition");
    }
  }
  return <App />;
});


function App() {
  const {
    applyExtensionMetafieldChange,
    discountType,
    discountValue,
    onDiscountTypeChange,
    onDiscountValueChange,
    productIds,
    onProductIdsChange,
    selectedCollections,
    onSelectCollections,
    onRemoveCollection,
    resetForm,
  } = useExtensionData();

  return (
    <FunctionSettings onSave={applyExtensionMetafieldChange}>
      <Heading size={6}>Klaviyo Discount Configuration</Heading>
      <Form onReset={resetForm} onSubmit={applyExtensionMetafieldChange}>
        <Section>
          <BlockStack gap="base">
            <Text>This discount applies to products without a compare at price. Configure the discount settings below.</Text>
            
            <TextField
              label="Product IDs (comma-separated)"
              value={productIds}
              onChange={onProductIdsChange}
              placeholder="gid://shopify/Product/123, gid://shopify/Product/456"
              helpText="Enter specific product GraphQL IDs to target, or leave empty to include all products"
              multiline={2}
            />

            <CollectionsSection
              selectedCollections={selectedCollections}
              onClickAdd={onSelectCollections}
              onClickRemove={onRemoveCollection}
            />

            <Text>
              The discount automatically detects and applies to variants without compare at price in real-time. 
              Specify product IDs or collections above to limit the discount, or leave both empty to apply to all eligible variants store-wide.
            </Text>
            
            <Select
              label="Discount Type"
              name="discountType"
              value={discountType}
              onChange={onDiscountTypeChange}
              options={[
                { label: "Percentage", value: "percentage" },
                { label: "Fixed Amount", value: "amount" }
              ]}
            />

            <NumberField
              label={discountType === "percentage" ? "Discount Percentage" : "Discount Amount ($)"}
              name="discountValue"
              value={Number(discountValue)}
              onChange={(value) => onDiscountValueChange(String(value))}
              suffix={discountType === "percentage" ? "%" : "$"}
              min="0"
              step={discountType === "percentage" ? "1" : "0.01"}
            />
          </BlockStack>
        </Section>
      </Form>
    </FunctionSettings>
  );
}

function CollectionsSection({ selectedCollections, onClickAdd, onClickRemove }) {
  const CollectionRows =
    selectedCollections && selectedCollections.length > 0
      ? selectedCollections.map((collection) => (
          <BlockStack gap="base" key={collection.id}>
            <InlineStack
              blockAlignment="center"
              inlineAlignment="space-between"
            >
              <Link
                href={`shopify://admin/collections/${collection.id
                  .split('/')
                  .pop()}`}
                tone="inherit"
                target="_blank"
              >
                {collection.title}
              </Link>
              <Button
                variant="tertiary"
                onClick={() => onClickRemove(collection.id)}
              >
                <Icon name="CircleCancelMajor" />
              </Button>
            </InlineStack>
          </BlockStack>
        ))
      : null;

  return (
    <Box>
      <Section>
        <Text appearance="subdued">Collections</Text>
        <BlockStack padding="small none small none" gap="base">
          {CollectionRows}
          {selectedCollections.length === 0 ? (
            <Button onClick={onClickAdd}>
              <InlineStack
                blockAlignment="center"
                inlineAlignment="start"
                gap="base"
              >
                <Icon name="CirclePlusMajor" />
                Add Collections
              </InlineStack>
            </Button>
          ) : (
            <Button variant="tertiary" onClick={onClickAdd}>
              Add More Collections
            </Button>
          )}
        </BlockStack>
      </Section>
    </Box>
  );
}

function useExtensionData() {
  const { applyMetafieldChange, data, query, resourcePicker } = useApi(TARGET);
  
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('20');
  const [productIds, setProductIds] = useState('');
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeFormData() {
      if (data?.metafields) {
        const metafieldValue = data.metafields.find(
          (metafield) => metafield.key === "function-configuration"
        )?.value;
        
        const config = await parseMetafield(metafieldValue, query);
        
        setDiscountType(config.discountType);
        setDiscountValue(config.discountValue);
        setProductIds(config.productIds);
        setSelectedCollections(config.collections);
        setIsLoading(false);
      }
    }
    
    initializeFormData();
  }, [data?.metafields, query]);


  const onDiscountTypeChange = (value) => {
    setDiscountType(value);
  };

  const onDiscountValueChange = (value) => {
    setDiscountValue(value);
  };

  const onProductIdsChange = (value) => {
    setProductIds(value);
  };

  const onSelectCollections = async () => {
    try {
      const selection = await resourcePicker({
        type: 'collection',
        selectionIds: selectedCollections.map((collection) => ({
          id: collection.id,
        })),
        action: 'select',
        multiple: 100,
      });
      if (selection) {
        setSelectedCollections(selection);
      }
    } catch (error) {
      console.error('Error selecting collections:', error);
    }
  };

  const onRemoveCollection = (collectionId) => {
    setSelectedCollections(
      selectedCollections.filter((collection) => collection.id !== collectionId)
    );
  };


  async function applyExtensionMetafieldChange() {
    await applyMetafieldChange({
      type: "updateMetafield",
      namespace: METAFIELD_NAMESPACE,
      key: "function-configuration",
      value: JSON.stringify({
        [discountType]: parseFloat(discountValue) || 0,
        productIds,
        collections: selectedCollections.map((collection) => collection.id)
      }),
      valueType: "json",
    });
  }

  const resetForm = async () => {
    if (data?.metafields) {
      const metafieldValue = data.metafields.find(
        (metafield) => metafield.key === "function-configuration"
      )?.value;
      
      const config = await parseMetafield(metafieldValue, query);
      
      setDiscountType(config.discountType);
      setDiscountValue(config.discountValue);
      setProductIds(config.productIds);
      setSelectedCollections(config.collections);
    }
  };

  return {
    applyExtensionMetafieldChange,
    discountType,
    discountValue,
    productIds,
    selectedCollections,
    onDiscountTypeChange,
    onDiscountValueChange,
    onProductIdsChange,
    onSelectCollections,
    onRemoveCollection,
    resetForm,
    isLoading,
  };
}

const METAFIELD_NAMESPACE = "$app:klaviyo-discount";
const METAFIELD_KEY = "function-configuration";

async function getMetafieldDefinition(adminApiQuery) {
  const query = `#graphql
    query GetMetafieldDefinition {
      metafieldDefinitions(first: 1, ownerType: DISCOUNT, namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
        nodes {
          id
        }
      }
    }
  `;

  const result = await adminApiQuery(query);

  return result?.data?.metafieldDefinitions?.nodes[0];
}
async function createMetafieldDefinition(adminApiQuery) {
  const definition = {
    access: {
      admin: "MERCHANT_READ_WRITE",
    },
    key: METAFIELD_KEY,
    name: "Discount Configuration",
    namespace: METAFIELD_NAMESPACE,
    ownerType: "DISCOUNT",
    type: "json",
  };

  const query = `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
            id
          }
        }
      }
  `;

  const variables = { definition };
  const result = await adminApiQuery(query, { variables });

  return result?.data?.metafieldDefinitionCreate?.createdDefinition;
}

async function parseMetafield(value, adminApiQuery) {
  try {
    const parsed = JSON.parse(value || "{}");
    const discountType = parsed.percentage ? 'percentage' : 'amount';
    const rawValue = parsed.percentage || parsed.amount || (discountType === 'percentage' ? 20 : 10);
    
    const discountValue = rawValue;
    
    let collections = [];
    if (parsed.collections && parsed.collections.length > 0) {
      try {
        const collectionsData = await getCollectionTitles(parsed.collections, adminApiQuery);
        collections = collectionsData || [];
      } catch (error) {
        console.error('Error fetching collection titles:', error);
        collections = parsed.collections.map(id => ({ id, title: 'Unknown Collection' }));
      }
    }
    
    return {
      discountType,
      discountValue: String(discountValue),
      productIds: parsed.productIds || '',
      collections
    };
  } catch {
    return {
      discountType: 'percentage',
      discountValue: '20',
      productIds: '',
      collections: []
    };
  }
}

async function getCollectionTitles(collectionIds, adminApiQuery) {
  if (!collectionIds || collectionIds.length === 0) return [];
  
  const query = `
    {
      nodes(ids: ${JSON.stringify(collectionIds)}) {
        ... on Collection {
          id
          title
        }
      }
    }
  `;
  
  const result = await adminApiQuery(query);
  return result?.data?.nodes || [];
}

