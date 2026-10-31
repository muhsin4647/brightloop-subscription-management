import React, { useState, useEffect } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Product, ProductVariant } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { Search, Plus, Tag, Layers, Check, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const ProductsPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected product for variant management
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariantsModal, setShowVariantsModal] = useState(false);

  // Add Product modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState<'software' | 'service' | 'addon'>('software');
  const [basePrice, setBasePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Variant form
  const [attrName, setAttrName] = useState('Brand');
  const [optionName, setOptionName] = useState('');
  const [priceAdj, setPriceAdj] = useState('0');

  const fetchProducts = async () => {
    try {
      const data = await apiRequest<Product[]>('/products?includeArchived=true');
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openVariantsModal = async (product: Product) => {
    setSelectedProduct(product);
    setShowVariantsModal(true);
    try {
      const data = await apiRequest(`/products/${product.id}`);
      setVariants(data.variants || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          product_type: productType,
          base_price: parseFloat(basePrice),
          cost_price: parseFloat(costPrice || '0'),
          currency: 'INR',
        }),
      });

      setShowAddModal(false);
      setName('');
      setCode('');
      setDescription('');
      setBasePrice('');
      setCostPrice('');
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await apiRequest(`/products/${selectedProduct.id}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          attribute_name: attrName.trim(),
          option_name: optionName.trim(),
          price_adjustment: parseFloat(priceAdj || '0'),
        }),
      });

      setOptionName('');
      setPriceAdj('0');
      const updated = await apiRequest(`/products/${selectedProduct.id}`);
      setVariants(updated.variants || []);
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog &amp; Variants</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Base SaaS software, add-ons, brand adjustments, and immutable commercial pricing snapshots.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Product
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Base Sales Price</th>
                <th className="py-3 px-4 text-center">Configured Variants</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading catalog...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No products configured.</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {p.description && <div className="text-[11px] text-slate-500 truncate max-w-sm">{p.description}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                        {p.product_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(p.base_price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openVariantsModal(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] transition-colors"
                      >
                        <Tag className="w-3 h-3" />
                        {p.variants_count || 0} Variants
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openVariantsModal(p)}
                        className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium"
                      >
                        Manage Variants
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variants Manager Modal */}
      {selectedProduct && (
        <Modal
          isOpen={showVariantsModal}
          onClose={() => {
            setShowVariantsModal(false);
            setSelectedProduct(null);
          }}
          title={`Pricing Variants: ${selectedProduct.name}`}
          subtitle={`SKU: ${selectedProduct.code} | Base Price: ${formatCurrency(selectedProduct.base_price)}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            {/* List Existing Variants */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700">
                Active Options &amp; Price Adjustments
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {variants.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No variant options configured for this product.</div>
                ) : (
                  variants.map((v) => (
                    <div key={v.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{v.option_name}</span>
                        <span className="text-[11px] text-slate-400 ml-2">({v.attribute_name})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-indigo-700">
                          {v.price_adjustment >= 0 ? `+${formatCurrency(v.price_adjustment)}` : formatCurrency(v.price_adjustment)}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          Total: {formatCurrency(selectedProduct.base_price + v.price_adjustment)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Variant Form */}
            {isAdmin && (
              <form onSubmit={handleAddVariant} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Add New Variant Option</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Attribute</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Brand, Edition"
                      value={attrName}
                      onChange={(e) => setAttrName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Option Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Odoo, Premium"
                      value={optionName}
                      onChange={(e) => setOptionName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Price Adjustment (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="560"
                      value={priceAdj}
                      onChange={(e) => setPriceAdj(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs"
                  >
                    Add Variant Option
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
        subtitle="Configure catalog software offering or add-on"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Brightloop Starter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Code</label>
              <input
                type="text"
                required
                placeholder="BL-STARTER"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Type</label>
              <select
                value={productType}
                onChange={(e: any) => setProductType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="software">Software</option>
                <option value="addon">Add-on</option>
                <option value="service">Service</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Base Sales Price (INR)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="2000"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (INR)</label>
              <input
                type="number"
                step="0.01"
                placeholder="400"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Product description and scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
