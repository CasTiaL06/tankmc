// Azure uygulama kaydının Client ID'si (genel/public client kimliği: gizli değildir, repoya yazılabilir).
// Gerekirse TANK_CLIENT_ID ortam değişkeni bunu geçersiz kılar (test için).
// Güncellemelerin okunacağı GitHub deposu ("kullanici/depo", herkese açık olmalı). Boşsa güncelleme kontrolü kapalıdır.
export const UPDATE_REPO: string = process.env.TANK_UPDATE_REPO || ''

export const CLIENT_ID: string = process.env.TANK_CLIENT_ID || '0615ced5-9cf2-4931-95df-8c0265e82a2a'
