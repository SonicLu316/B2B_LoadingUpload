import React, { useState, useMemo, useRef } from 'react';
import {
  Camera, Lock, Save, Send, Trash2, RotateCcw,
  CheckCircle2, MapPin, ClipboardList, ChevronUp,
  Info, Search, Plus, Clock, Filter, ChevronRight, X,
  Loader2, AlertTriangle
} from 'lucide-react';
import { ContainerRecord, ModalState, RecordData, UploadStep, ModalType } from './types';

/**
 * 預定義的拍照順序
 */
const UPLOAD_STEPS: UploadStep[] = [
  { id: 1, label: '1. Container closed' },
  { id: 2, label: '2. Container empty' },
  { id: 3, label: '3. Row 1a' },
  { id: 4, label: '4. Row 1b' },
  { id: 5, label: '5. Row 2a' },
  { id: 6, label: '6. Row 2b' },
];

const App = () => {
  // 頁面路由狀態: 'LIST' (列表首頁) | 'UPLOAD' (上傳頁面)
  const [view, setView] = useState<'LIST' | 'UPLOAD'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 自定義 Modal 狀態
  const [modal, setModal] = useState<ModalState>({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'info'
  });

  // 模擬資料庫中的裝櫃列表
  const [containerRecords, setContainerRecords] = useState<ContainerRecord[]>([
    { id: '1', poNumber: 'PO-2023001', shippingLocation: '鹽田港', photoCount: 6, status: 'COMPLETED', updatedAt: '2023-12-24 10:30' },
    { id: '2', poNumber: 'PO-2023005', shippingLocation: '寧波港', photoCount: 3, status: 'DRAFT', updatedAt: '2023-12-24 11:15' },
    { id: '3', poNumber: 'PO-2023009', shippingLocation: '高雄港', photoCount: 0, status: 'PENDING', updatedAt: '2023-12-24 09:00' },
  ]);

  // 上傳頁面的持久化與工作狀態
  const [savedData, setSavedData] = useState<RecordData>({ poNumber: '', shippingLocation: '', photos: {} });
  const [workingData, setWorkingData] = useState<RecordData>({ ...savedData });

  // DOM Refs
  const poRef = useRef<HTMLDivElement>(null);
  const shippingRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // ----------------------------------------------------------------
  // 邏輯計算區 (Helpers)
  // ----------------------------------------------------------------

  const isUnlocked = (id: number) => {
    if (id === 1) return true;
    return !!workingData.photos[id - 1]?.file;
  };

  const hasChanges = useMemo(() => {
    // 簡單的深比較，用於判斷是否有未存檔的變更
    const serialize = (data: RecordData) => ({
      ...data,
      photos: Object.keys(data.photos).reduce((acc, key) => {
        const k = Number(key);
        acc[k] = {
          hasFile: !!data.photos[k]?.file,
          remark: data.photos[k]?.remark
        };
        return acc;
      }, {} as any)
    });
    return JSON.stringify(serialize(savedData)) !== JSON.stringify(serialize(workingData));
  }, [workingData, savedData]);

  const validation = useMemo(() => {
    const photoIds = Object.keys(workingData.photos).filter(id => !!workingData.photos[Number(id)]?.file);
    const photoCount = photoIds.length;
    const errors: string[] = [];
    let firstMissingRef: React.RefObject<HTMLDivElement> | { current: HTMLDivElement | null } | null = null;

    if (!workingData.poNumber.trim()) {
      errors.push("PO 單號未填");
      if (!firstMissingRef) firstMissingRef = poRef;
    }
    if (!workingData.shippingLocation.trim()) {
      errors.push("出貨地未填");
      if (!firstMissingRef) firstMissingRef = shippingRef;
    }
    for (const step of UPLOAD_STEPS) {
      if (!workingData.photos[step.id]?.file) {
        errors.push(`照片未完成: ${step.label}`);
        if (!firstMissingRef) firstMissingRef = { current: stepRefs.current[step.id] };
        break;
      }
    }
    return { isValid: errors.length === 0, errors, photoCount, firstMissingRef };
  }, [workingData]);

  const filteredRecords = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    return containerRecords.filter(r =>
      r.poNumber.toLowerCase().includes(lowerTerm) ||
      r.shippingLocation.toLowerCase().includes(lowerTerm)
    );
  }, [containerRecords, searchTerm]);

  // ----------------------------------------------------------------
  // 操作處理區
  // ----------------------------------------------------------------

  const showAlert = (title: string, message: string, type: ModalType = 'info') => {
    setModal({ show: true, title, message, type, onConfirm: null });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: ModalType = 'warning') => {
    setModal({ show: true, title, message, type, onConfirm });
  };

  const handleBackToList = () => {
    if (savedData.status === 'COMPLETED') {
      setView('LIST');
      return;
    }

    if (hasChanges) {
      showConfirm("放棄變更", "您有尚未存檔的內容，確定要放棄並返回列表嗎？", () => {
        setView('LIST');
        setModal(prev => ({ ...prev, show: false }));
      });
    } else {
      setView('LIST');
    }
  };

  const handleFileChange = (id: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setWorkingData(prev => ({
        ...prev,
        photos: {
          ...prev.photos,
          [id]: {
            file,
            preview: reader.result as string,
            remark: prev.photos[id]?.remark || ''
          }
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const updateRemark = (id: number, remark: string) => {
    setWorkingData(prev => ({
      ...prev,
      photos: {
        ...prev.photos,
        [id]: {
          ...prev.photos[id], // 保留 file 和 preview
          file: prev.photos[id]?.file || null, // 確保不為 undefined
          preview: prev.photos[id]?.preview || null,
          remark: remark
        }
      }
    }));
  };

  const handleDelete = (id: number) => {
    setWorkingData(prev => {
      const updatedPhotos = { ...prev.photos };
      delete updatedPhotos[id];
      return { ...prev, photos: updatedPhotos };
    });
  };

  const handleSaveDraft = () => {
    setSavedData({ ...workingData });
    showAlert("暫存成功", "您的進度已成功記錄在本地暫存空間。", "success");
  };

  const handleReset = () => {
    showConfirm("重置內容", "確定要放棄目前未暫存的所有更動嗎？", () => {
      setWorkingData({ ...savedData });
      setModal(prev => ({ ...prev, show: false }));
    });
  };

  // 確認送出邏輯
  const handleSubmit = () => {
    if (hasChanges) {
      showAlert("提示", "偵測到您有新的編輯內容，請先點擊「暫存」再送出。", "warning");
      return;
    }
    if (!validation.isValid) return;

    showConfirm("確認送出", "確定要將此裝櫃紀錄全數送出嗎？送出後將無法直接修改。", async () => {
      setModal(prev => ({ ...prev, show: false }));
      setIsSubmitting(true);

      // 模擬網路延遲
      setTimeout(() => {
        const newRecord: ContainerRecord = {
          id: Date.now().toString(),
          poNumber: workingData.poNumber,
          shippingLocation: workingData.shippingLocation,
          photoCount: validation.photoCount,
          status: 'COMPLETED',
          updatedAt: new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '-')
        };

        // Remove old record if it exists (update scenario) or add new
        // For simplicity, we just unshift the new one, but in a real app we'd check ID.
        setContainerRecords(prev => [newRecord, ...prev]);

        const emptyState: RecordData = { poNumber: '', shippingLocation: '', photos: {} };
        setSavedData(emptyState);
        setWorkingData(emptyState);

        setIsSubmitting(false);
        setView('LIST');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1000);
    }, "primary");
  };

  const handleSmartNavigation = () => {
    if (validation.isValid) window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (validation.firstMissingRef?.current) {
      validation.firstMissingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // List Actions
  const handleEditRecord = (record: ContainerRecord) => {
    const dummyPhotos: RecordData['photos'] = {};
    // Simulate photo presence for mock data so UI looks correct
    if (record.photoCount > 0) {
      for (let i = 1; i <= record.photoCount; i++) {
        dummyPhotos[i] = {
          file: new File([""], "dummy.jpg"),
          preview: null, // No real preview for mock data
          remark: `Record ${record.id} - Step ${i}`
        };
      }
    }
    const data: RecordData = {
      id: record.id,
      poNumber: record.poNumber,
      shippingLocation: record.shippingLocation,
      photos: dummyPhotos,
      status: record.status
    };
    setSavedData(data);
    setWorkingData(data);
    setView('UPLOAD');
  };

  const handleDeleteRecord = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showConfirm("刪除紀錄", "確定要刪除此筆紀錄嗎？此動作無法復原。", () => {
      setContainerRecords(prev => prev.filter(r => r.id !== id));
      setModal(prev => ({ ...prev, show: false }));
    });
  };

  // ----------------------------------------------------------------
  // 自定義 Modal 組件渲染
  // ----------------------------------------------------------------
  const CustomModal = () => {
    if (!modal.show) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl p-6 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center">
            {modal.type === 'warning' && <AlertTriangle className="text-amber-500 mb-3" size={48} />}
            {modal.type === 'primary' && <Send className="text-blue-600 mb-3" size={48} />}
            {modal.type === 'success' && <CheckCircle2 className="text-green-500 mb-3" size={48} />}
            {modal.type === 'info' && <Info className="text-blue-400 mb-3" size={48} />}

            <h3 className="text-lg font-black text-slate-800 mb-2">{modal.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{modal.message}</p>

            <div className="flex w-full gap-3">
              {modal.onConfirm ? (
                <>
                  <button
                    onClick={() => setModal({ ...modal, show: false })}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={modal.onConfirm}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
                  >
                    確定
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModal({ ...modal, show: false })}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
                >
                  我知道了
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <CustomModal />

      {/* 列表頁 Header */}
      {view === 'LIST' && (
        <header className="bg-white border-b p-6 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">裝櫃進度查詢</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Container Management System</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors"><Filter size={20} /></div>
          </div>
        </header>
      )}

      {/* 上傳頁 Header */}
      {view === 'UPLOAD' && (
        <header className="bg-white border-b p-4 sticky top-0 z-40 shadow-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBackToList}
              className={`flex items-center gap-1 font-bold text-sm transition-colors ${savedData.status === 'COMPLETED' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-red-500'}`}
            >
              {savedData.status === 'COMPLETED' ? (
                <><ChevronRight className="rotate-180" size={20} /> 回首頁</>
              ) : (
                <><X size={20} /> 取消新增</>
              )}
            </button>
            <h2 className="text-lg font-black text-slate-800">
              {savedData.status === 'COMPLETED' 
                ? '裝櫃紀錄查閱'
                : savedData.poNumber ? '編輯裝櫃紀錄' : '新增裝櫃紀錄'}
            </h2>
            <div className="w-16"></div>
          </div>
        </header>
      )}

      <main className="max-w-2xl mx-auto p-4">
        {view === 'LIST' ? (
          <div className="animate-in fade-in duration-500">
            {/* 統計概覽 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: '今日總計', value: containerRecords.length, color: 'text-blue-600' },
                { label: '進行中', value: containerRecords.filter(r => r.status === 'DRAFT' || r.photoCount < 6).length, color: 'text-orange-600' },
                { label: '已完成', value: containerRecords.filter(r => r.status === 'COMPLETED').length, color: 'text-green-600' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{item.label}</span>
                  <span className={`text-xl font-black ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* 搜尋欄 */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input
                type="text"
                placeholder="搜尋 PO 單號..."
                className="w-full bg-white border-2 border-slate-100 rounded-2xl p-3 pl-12 shadow-sm focus:border-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 列表內容 */}
            <div className="space-y-4">
              {filteredRecords.length > 0 ? filteredRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleEditRecord(record)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center group active:scale-[0.98] transition-all cursor-pointer hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-slate-800">{record.poNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${record.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                        {record.status === 'COMPLETED' ? '已完成' : '編輯中'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><MapPin size={12} /> {record.shippingLocation}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {record.updatedAt}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${record.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${(record.photoCount / 6) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 tracking-tighter">{record.photoCount}/6</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteRecord(e, record.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" size={20} />
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Search size={32} />
                  </div>
                  <p className="text-slate-400 font-bold">找不到相符的 PO 單號</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSavedData({ poNumber: '', shippingLocation: '', photos: {} });
                setWorkingData({ poNumber: '', shippingLocation: '', photos: {} });
                setView('UPLOAD');
              }}
              className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-all z-50 hover:bg-blue-700 hover:scale-105"
            >
              <Plus size={32} />
            </button>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right duration-500 pb-48">
            {/* 基礎資訊 */}
            <section ref={poRef} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
              <div className="flex items-center gap-2 mb-4 text-blue-700 font-bold border-b border-slate-50 pb-3">
                <ClipboardList size={20} />
                <span>貨物基礎資訊</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Purchase Order</label>
                  <input
                    placeholder="輸入 PO 單號"
                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 focus:border-blue-500 focus:bg-white outline-none transition-all font-mono ${!workingData.poNumber ? 'border-red-50' : 'border-slate-50'} ${savedData.status === 'COMPLETED' ? 'opacity-70 cursor-not-allowed' : ''}`}
                    value={workingData.poNumber}
                    disabled={savedData.status === 'COMPLETED'}
                    onChange={e => setWorkingData(prev => ({ ...prev, poNumber: e.target.value }))}
                  />
                </div>
                <div ref={shippingRef} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                  <input
                    placeholder="出貨地點"
                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 focus:border-blue-500 focus:bg-white outline-none transition-all ${!workingData.shippingLocation ? 'border-red-50' : 'border-slate-50'} ${savedData.status === 'COMPLETED' ? 'opacity-70 cursor-not-allowed' : ''}`}
                    value={workingData.shippingLocation}
                    disabled={savedData.status === 'COMPLETED'}
                    onChange={e => setWorkingData(prev => ({ ...prev, shippingLocation: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            {/* 照片步驟 */}
            <section className="space-y-4">
              {UPLOAD_STEPS.map((step) => {
                const unlocked = isUnlocked(step.id);
                const photoData = workingData.photos[step.id];
                const isCompleted = !!photoData?.file;
                return (
                  <div key={step.id} ref={el => { stepRefs.current[step.id] = el }} className={`p-4 rounded-3xl border-2 transition-all duration-500 ${unlocked ? 'bg-white border-white shadow-sm' : 'bg-slate-200/40 border-transparent opacity-60'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${isCompleted ? 'bg-green-100 text-green-600' : unlocked ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                          {isCompleted ? <CheckCircle2 size={16} /> : step.id}
                        </div>
                        <span className={`font-bold ${unlocked ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
                      </div>
                      {!unlocked && <Lock size={16} className="text-slate-300" />}
                    </div>
                    {unlocked && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-500">
                        <div className="relative aspect-video rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group">
                          {photoData?.preview ? (
                            <>
                              <img src={photoData.preview} className="w-full h-full object-cover" alt="Preview" />
                              {savedData.status !== 'COMPLETED' && (
                                <button onClick={() => handleDelete(step.id)} className="absolute top-3 right-3 bg-red-500 text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-transform opacity-0 group-hover:opacity-100 hover:scale-110"><Trash2 size={20} /></button>
                              )}
                            </>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-blue-50/50 transition-colors">
                              <div className="bg-blue-100 p-4 rounded-full mb-2 text-blue-600 shadow-sm group-hover:scale-110 transition-transform"><Camera size={28} /></div>
                              <span className="text-sm font-black text-blue-600">
                                {isCompleted ? '重新拍攝' : '拍攝照片或選取'}
                              </span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(step.id, e.target.files ? e.target.files[0] : null)} />
                            </label>
                          )}
                        </div>
                        <input
                          placeholder={savedData.status === 'COMPLETED' ? "無備註" : "新增備註說明..."}
                          className={`bg-slate-50 w-full p-4 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-blue-100 focus:bg-white transition-all ${savedData.status === 'COMPLETED' ? 'opacity-80' : ''}`}
                          value={photoData?.remark || ''}
                          disabled={savedData.status === 'COMPLETED'}
                          onChange={(e) => updateRemark(step.id, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-center pt-10">
                <button onClick={handleSmartNavigation} className="flex flex-col items-center gap-2 group">
                  <div className={`p-4 rounded-full border-2 transition-all shadow-sm ${validation.isValid ? 'border-green-200 bg-green-50 text-green-600' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>
                    {validation.isValid ? <ChevronUp size={24} /> : <Search size={24} />}
                  </div>
                  <span className="text-xs font-black text-slate-400 group-hover:text-blue-600">
                    {validation.isValid ? "內容已齊全，回到頂部" : "前往下一個未完成項目"}
                  </span>
                </button>
              </div>
            </section>

            {/* 上傳頁 Footer */}
            {savedData.status !== 'COMPLETED' && (
              <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-2xl mx-auto flex flex-col gap-3">
                  {hasChanges && (
                    <div className="flex items-center justify-between bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 text-[10px] font-black text-amber-700">
                      <span className="flex items-center gap-1.5"><Info size={14} /> 偵測到編輯內容，請先點擊暫存</span>
                      <button onClick={handleReset} className="text-red-500 flex items-center gap-1 hover:underline"><RotateCcw size={14} /> 放棄變更</button>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button
                      onClick={handleSaveDraft}
                      disabled={!hasChanges || isSubmitting}
                      className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${hasChanges ? 'bg-white border-2 border-blue-600 text-blue-600 shadow-sm active:bg-blue-50' : 'bg-slate-50 text-slate-300'}`}
                    >
                      <Save size={20} /> 暫存
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={hasChanges || !validation.isValid || isSubmitting}
                      className={`flex-[1.5] py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${(!hasChanges && validation.isValid) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95 hover:bg-blue-700' : 'bg-slate-200 text-slate-400'}`}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                      {isSubmitting ? '傳送中...' : hasChanges ? '[請先暫存]' : validation.isValid ? '[確認全數送出]' : '[數量尚未齊全]'}
                    </button>
                  </div>
                </div>
              </footer>
            )}

            {savedData.status === 'COMPLETED' && (
              <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-2xl mx-auto flex justify-center">
                  <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} /> 此單號已結案，僅供查閱
                  </div>
                </div>
              </footer>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;