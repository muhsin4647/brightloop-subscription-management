import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatCurrency, formatDate } from '../../lib/api.ts';
import { Product, ProductVariant } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import {
  Search,
  Plus,
  Tag,
  Layers,
  Check,
  Edit2,
  Package,
  Boxes,
  Percent,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const ProductsPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      setLoading(true);
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

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.product_type.toLowerCase().includes(q)
    );
  }, [products, search]);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog &amp; Pricing Variants</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Base SaaS software offerings, add-ons, brand adjustments, and immutable line item calculations.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Catalog Items</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {products.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Core software packages</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Configured Add-ons</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {products.filter((p) => p.product_type === 'addon').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Optional subscription increments</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Variant Surcharges</span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {products.reduce((acc, p) => acc + (p.variants_count || 0), 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Active pricing modifiers</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl border border-slate-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <span className="font-bold text-slate-900">{filteredProducts.length}</span> catalog items
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
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
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products configured.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px]">
                        {p.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      {p.description && <div className="text-[11px] text-slate-400 truncate max-w-sm">{p.description}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-slate-700 font-semibold text-[10px]">
                        {p.product_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(p.base_price)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openVariantsModal(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200/80 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{p.variants_count || 0} Variants</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openVariantsModal(p)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
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
          subtitle={`SKU: ${selectedProduct.code} · Base Price: ${formatCurrency(selectedProduct.base_price)}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            {/* List Existing Variants */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-700">
                Active Options &amp; Price Adjustments
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {variants.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No variant options configured for this product.</div>
                ) : (
                  variants.map((v) => (
                    <div key={v.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{v.option_name}</span>
                        <span className="text-[11px] text-slate-400 ml-2">({v.attribute_name})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-indigo-700 tabular-nums">
                          {v.price_adjustment >= 0 ? `+${formatCurrency(v.price_adjustment)}` : formatCurrency(v.price_adjustment)}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Effective: {formatCurrency(selectedProduct.base_price + v.price_adjustment)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Variant Form */}
            {isAdmin && (
              <form onSubmit={handleAddVariant} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Add New Variant Option</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Attribute</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Brand, Edition"
                      value={attrName}
                      onChange={(e) => setAttrName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Option Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Enterprise, Pro"
                      value={optionName}
                      onChange={(e) => setOptionName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Adjustment (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="500"
                      value={priceAdj}
                      onChange={(e) => setPriceAdj(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs cursor-pointer"
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
        title="Add New Catalog Product"
        subtitle="Configure software offering, base unit pricing, or recurring add-on"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Brightloop Enterprise"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Code *</label>
              <input
                type="text"
                required
                placeholder="BL-ENT"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono uppercase bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Type</label>
              <select
                value={productType}
                onChange={(e: any) => setProductType(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden cursor-pointer"
              >
                <option value="software">Software</option>
                <option value="addon">Add-on</option>
                <option value="service">Service</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Base Price (INR) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="2000"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono font-bold bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
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
                className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Commercial description and feature inclusions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
