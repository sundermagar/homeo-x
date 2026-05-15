import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Receipt, PlusCircle } from 'lucide-react';
import {
  useCharges,
  useCreateCharge,
  useUpdateCharge,
  useDeleteCharge,
} from '../../billing/hooks/use-accounts';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export function ChargesPage() {
  const { data: charges, isLoading } = useCharges();
  const createMutation = useCreateCharge();
  const updateMutation = useUpdateCharge();
  const deleteMutation = useDeleteCharge();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<any>(null);

  // Form State
  const [type, setType] = useState('Normal'); // 'Normal' = Service, 'Product' = Product
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('0');

  const filteredCharges = charges?.filter(c =>
    c.charges?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleOpenModal = (charge?: any) => {
    if (charge) {
      setEditingCharge(charge);
      setType(charge.type || 'Normal');
      setName(charge.charges || '');
      setAmount(charge.amount?.toString() || '');
      setQuantity(charge.quantity?.toString() || '0');
    } else {
      setEditingCharge(null);
      setType('Normal');
      setName('');
      setAmount('');
      setQuantity('0');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCharge(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    try {
      const payload = {
        charges: name,
        amount: parseFloat(amount),
        quantity: type === 'Product' ? parseInt(quantity || '0', 10) : 0,
        type: type, // 'Normal' or 'Product'
      };

      if (editingCharge) {
        await updateMutation.mutateAsync({
          id: editingCharge.id,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save charge', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Failed to delete charge', err);
      }
    }
  };

  return (
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <PlusCircle size={20} className="color-primary" />
            Additional Charges
          </h1>
          <p className="plat-header-sub">Manage service and product charges catalog.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={14} /> Add Service
          </button>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap" style={{ flex: 1 }}>
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm color-muted flex items-center px-4">
          Showing {filteredCharges.length > 0 ? 1 : 0} to {filteredCharges.length} entries
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="p-8 text-center color-muted">Loading services...</div>
        ) : filteredCharges.length === 0 ? (
          <div className="p-8 text-center color-muted">No entries found</div>
        ) : (
          <div className="plat-table-container border-none">
            <table className="plat-table">
              <thead>
                <tr>
                  <th className="w-10">ID</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Quantity</th>
                  <th>Service Type</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCharges.map((charge, idx) => {
                  const isProduct = charge.type === 'Product';
                  return (
                    <tr key={charge.id} className="plat-table-row">
                      <td className="plat-table-cell text-xs color-muted font-mono">{idx + 1}</td>
                      <td className="plat-table-cell font-medium color-main">
                        {charge.charges}
                      </td>
                      <td className="plat-table-cell color-main">
                        {charge.amount}
                      </td>
                      <td className="plat-table-cell color-main">
                        {isProduct && charge.quantity > 0 ? charge.quantity : 0}
                      </td>
                      <td className="plat-table-cell color-muted">
                        {charge.type === 'Normal' ? 'Service' : 'Product'}
                      </td>
                      <td className="plat-table-cell" style={{ textAlign: 'right' }}>
                        <div className="flex justify-end gap-1">
                          <button
                            className="plat-btn-icon plat-btn-ghost"
                            onClick={() => handleOpenModal(charge)}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="plat-btn-icon plat-btn-ghost-danger"
                            onClick={() => handleDelete(charge.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Add Service/Product"
        maxWidth="450px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              
              <div className="plat-form-group">
                <label className="plat-form-label">Type:</label>
                <select 
                  className="plat-form-input" 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Type</option>
                  <option value="Normal">Service</option>
                  <option value="Product">Product</option>
                </select>
              </div>

              <div className="plat-form-group mt-5">
                <label className="plat-form-label">Service/Product :</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="plat-form-input"
                  placeholder="Product"
                />
              </div>

              <div className="plat-form-group mt-5">
                <label className="plat-form-label">Amount :</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="plat-form-input"
                  placeholder="Amount"
                />
              </div>

              {type === 'Product' && (
                <div className="plat-form-group mt-5 fade-in">
                  <label className="plat-form-label">Quantity :</label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="plat-form-input"
                    placeholder="quantity"
                  />
                </div>
              )}

            </div>
          </div>

          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px', borderTop: '1px solid var(--pp-warm-4)' }}>
            <button
              type="button"
              onClick={handleCloseModal}
              className="plat-btn plat-btn-ghost"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="plat-btn plat-btn-primary"
            >
              Submit
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
