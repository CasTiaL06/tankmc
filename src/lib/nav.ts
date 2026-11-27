export const NAV = [['home', 'Ana Sayfa'], ['library', 'Kütüphane'], ['servers', 'Sunucular'], ['packs', 'Mod Kütüphanesi'], ['downloads', 'İndirmeler'], ['player', 'Oyuncu'], ['settings', 'Ayarlar']] as const
export type Page = typeof NAV[number][0]
