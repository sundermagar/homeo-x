import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPinOff, Plus, MapPin, Tag, Check } from 'lucide-react';

export function PatientAddresses() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [addressType, setAddressType] = useState('HOME');

  const [addresses, setAddresses] = useState<any[]>([]);
  const [formData, setFormData] = useState({ label: '', line1: '', line2: '', city: '', state: '', pincode: '' });

  const handleSave = () => {
    if (!formData.line1 || !formData.city || !formData.pincode) {
      alert('Please fill in all required fields (*)');
      return;
    }
    
    const newAddress = {
      type: addressType,
      ...formData
    };

    setAddresses([...addresses, newAddress]);
    setFormData({ label: '', line1: '', line2: '', city: '', state: '', pincode: '' });
    setIsFormOpen(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#f5f3ef', zIndex: 50 }}>
      {/* Top App Bar */}
      <div style={{ flexShrink: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '16px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#1e293b' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#000000', fontSize: '1rem', marginRight: '20px' }}>
          My Addresses
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: addresses.length > 0 ? '16px' : '0', gap: '16px' }}>
        {addresses.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <MapPinOff size={36} color="#475569" strokeWidth={1.5} />
            <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 600 }}>
              No addresses yet
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', textAlign: 'center', maxWidth: '200px', lineHeight: '1.4' }}>
              Tap the button below to add your first address
            </div>
          </div>
        ) : (
          addresses.map((addr, idx) => (
            <div key={idx} style={{ background: 'white', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {addr.type}
                </span>
                {addr.label && <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{addr.label}</span>}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
                {addr.line1} {addr.line2 && `, ${addr.line2}`}<br />
                {addr.city}{addr.state && `, ${addr.state}`} - {addr.pincode}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Buttons */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
        {/* Add Address Button */}
        <button 
          onClick={() => setIsFormOpen(true)}
          style={{ background: 'var(--primary)', border: 'none', borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
        >
          <Plus size={18} />
          Add Address
        </button>
      </div>

      {/* Bottom Sheet Overlay for Form */}
      {isFormOpen && (
        <>
          <div 
            onClick={() => setIsFormOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
          />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', zIndex: 101, padding: '16px 20px 24px 20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Drag Handle */}
            <div style={{ width: '40px', height: '4px', background: '#000000', borderRadius: '2px', alignSelf: 'center', marginBottom: '8px' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <MapPin size={18} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Add New Address
              </div>
            </div>

            {/* Address Type Pills */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {['HOME', 'WORK'].map(type => {
                const isSelected = addressType === type;
                return (
                  <button 
                    key={type}
                    onClick={() => setAddressType(type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                      background: isSelected ? 'var(--primary)' : '#ffffff',
                      color: isSelected ? 'white' : '#1e293b',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid #cbd5e1'
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    {type}
                  </button>
                );
              })}
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <Tag size={18} color="#1e293b" />
                <input type="text" placeholder="Label (optional)" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', color: '#1e293b' }} />
              </div>

              {/* Address Line 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <MapPin size={18} color="#1e293b" />
                <input type="text" placeholder="Address Line 1 *" value={formData.line1} onChange={(e) => setFormData({...formData, line1: e.target.value})} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', color: '#1e293b' }} />
              </div>

              {/* Address Line 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <MapPin size={18} color="#1e293b" />
                <input type="text" placeholder="Address Line 2" value={formData.line2} onChange={(e) => setFormData({...formData, line2: e.target.value})} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', color: '#1e293b' }} />
              </div>

              {/* City & State */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <input type="text" placeholder="City *" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#1e293b' }} />
                </div>
                <div style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <input type="text" placeholder="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#1e293b' }} />
                </div>
              </div>

              {/* Pincode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ width: '20px', height: '14px', border: '2px solid #1e293b', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>123</div>
                <input type="number" placeholder="Pincode *" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', color: '#1e293b' }} />
              </div>

            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
            >
              Save Address
            </button>

          </div>
        </>
      )}
    </div>
  );
}

export default PatientAddresses;
