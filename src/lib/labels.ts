// Modrinth kategori ve istemci/sunucu değerlerinin Türkçe karşılıkları. Karşılığı olmayan kategoriler gösterilmez (İngilizce kalmasın).
export const CAT_TR: Record<string, string> = {
  adventure: 'Macera', cursed: 'Lanetli', decoration: 'Dekorasyon', economy: 'Ekonomi', equipment: 'Ekipman', food: 'Yemek', 'game-mechanics': 'Oyun mekaniği',
  library: 'Kütüphane', magic: 'Büyü', management: 'Yönetim', minigame: 'Mini oyun', mobs: 'Yaratıklar', optimization: 'Performans', social: 'Sosyal',
  storage: 'Depolama', technology: 'Teknoloji', transportation: 'Ulaşım', utility: 'Araçlar', worldgen: 'Dünya üretimi',
  challenging: 'Zorlayıcı', combat: 'Savaş', 'kitchen-sink': 'Karma', lightweight: 'Hafif', multiplayer: 'Çok oyunculu', quests: 'Görevler',
}
export const SIDE: Record<string, string> = { required: 'Gerekli', optional: 'İsteğe bağlı', unsupported: 'Desteklenmiyor', unknown: 'Bilinmiyor' }
export const daysAgo = (iso: string): string => {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return ''
  const d = Math.floor((Date.now() - t) / 86400000)
  return d <= 0 ? 'bugün' : d === 1 ? 'dün' : d < 30 ? `${d} gün önce` : d < 365 ? `${Math.floor(d / 30)} ay önce` : `${Math.floor(d / 365)} yıl önce`
}
