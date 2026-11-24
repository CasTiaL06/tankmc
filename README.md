# TANKmc

Modern, ücretsiz ve açık kaynak bir **Minecraft Java Edition** launcher'ı. Electron, React ve TypeScript ile yazıldı; siyah-antrasit-turuncu marka kimliğine sahip.

> TANKmc resmî bir Minecraft ürünü değildir; Mojang Studios veya Microsoft ile bağlantısı yoktur. Minecraft, Mojang Studios'un tescilli markasıdır. Offline/crack desteği **yoktur**: yalnızca Minecraft Java Edition'a sahip Microsoft hesaplarıyla giriş yapılır.

## Durum

| Aşama | Özellik | Durum |
|---|---|---|
| 1 | Mimari ve klasör yapısı | Tamam |
| 2 | Arayüz (ana sayfa, sunucular, mod paketleri, ayarlar) | Tamam; veriler örnek |
| 3 | Microsoft girişi | Kod yazıldı, gerçek hesapla test edilmedi |
| 4 | Sürüm indirme ve oyun başlatma | Planlandı |
| 5 | Forge, Fabric, NeoForge | Planlandı |
| 6 | Sunucu listesi (JSON/GitHub kaynağı) | Planlandı |
| 7 | Modrinth ve mod paketleri | Planlandı |
| 8 | Otomatik güncelleme (GitHub Releases) | Planlandı |
| 9-10 | Test ve Windows paketi | Portable EXE iş akışı hazır |

Ana ekrandaki OYNA, mod paketi kurulumu ve sunucuya katılma düğmeleri şu an arayüz önizlemesidir; ilgili aşamalar tamamlanana kadar gerçek işlem yapmaz.

## Geliştirme

Gereksinimler: Node.js 20+, Windows 10/11.

```bash
npm install
npm run dev        # Vite + Electron
npm run typecheck  # tip kontrolü
npm run build      # derleme
npm run dist       # release/ altında taşınabilir (portable) Windows EXE
```

## Microsoft girişi için kurulum (ücretsiz)

1. [Azure Portal](https://portal.azure.com) → App registrations → New registration. Hesap türü: *Personal Microsoft accounts only*.
2. Authentication → *Allow public client flows* = Yes.
3. Application (client) ID değerini `electron/config.ts` içine yaz veya `TANK_CLIENT_ID` ortam değişkeniyle ver. Client ID gizli bir bilgi değildir.
4. Mojang, Minecraft servislerini yalnızca onaylı uygulamalara açıyor. https://aka.ms/AppRegReview formunu doldur; onaydan önce giriş 403 hatası verebilir.

Oturum, Windows DPAPI (Electron `safeStorage`) ile şifrelenerek saklanır; şifreleme kullanılamıyorsa diske yazılmaz.

## Portable EXE

Kurulum gerektirmez; tek `TANKmc-Portable-<sürüm>.exe` dosyasıdır. Launcher verisi exe'nin yanındaki `TANKmc-Data` klasöründe tutulur. Giriş oturumu Windows kullanıcısına bağlı şifrelenir, bu yüzden başka bir bilgisayara taşınınca yeniden giriş gerekir.

EXE'yi kendin derlemek zorunda değilsin: `main`'e her push'ta GitHub Actions üretir. Repo → Actions → son çalışma → *Artifacts* → `TANKmc-Portable`.

## Sürüm yayınlama

```bash
git tag v0.1.0
git push origin v0.1.0
```

`v*` etiketi gönderilince GitHub Actions portable EXE'yi üretip Releases sayfasına ekler. Otomatik güncelleme (Aşama 8) bu Releases altyapısını kullanacak.

## Yapı

```
electron/   ana süreç, preload, Microsoft kimlik doğrulama
src/        React arayüzü (pages, components, lib, data)
.github/    CI ve release iş akışları
```

## Lisans

[MIT](LICENSE). Üçüncü taraf modların ve dosyaların lisansları kendi sahiplerine aittir.
