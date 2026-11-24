// Azure uygulama kaydından alınan Client ID. Genel (public client) bir kimliktir, gizli değildir; repoya yazılabilir. Ortam değişkeni (TANK_CLIENT_ID) varsa o öncelikli.
export const CLIENT_ID: string = process.env.TANK_CLIENT_ID ?? ''
