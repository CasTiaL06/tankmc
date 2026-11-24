# TankClient

Modern, ücretsiz ve açık kaynak bir **Minecraft Java Edition** launcher'ı. Electron, React ve TypeScript ile yazıldı; siyah-antrasit-turuncu marka kimliğine sahip.

> TankClient resmî bir Minecraft ürünü değildir; Mojang Studios veya Microsoft ile bağlantısı yoktur. Minecraft, Mojang Studios'un tescilli markasıdır. Offline/crack desteği **yoktur**: yalnızca Minecraft Java Edition'a sahip Microsoft hesaplarıyla giriş yapılır.

## Durum

| Alan | Durum |
|---|---|
| Arayüz (ana sayfa, sunucular, mod paketleri, ayarlar) | Çalışır; sunucu/paket verileri **örnek**, OYNA/Kur/Katıl düğmeleri **henüz gerçek işlem yapmaz** |
| Microsoft girişi | Kod yazıldı, gerçek hesapla test edilmedi; Client ID tanımlanmadıkça giriş hata verir (sahte giriş yok) |
| Marka (TankClient), ikon | Tamam |
| Veri klasörü ve TANKmc-Data taşıması | Yazıldı, mantığı bu ortamda test edildi (aşağıya bak) |
| Kurulumlu (NSIS) ve portable EXE yapılandırması | Hazır, derlenmedi |
| GitHub Actions | Hazır, henüz çalıştırılmadı |
| Minecraft başlatma, Java, Forge/Fabric/NeoForge, Modrinth, indirme merkezi, profil sayfası | Henüz yok |

## Geliştirme

Gereksinimler: Node.js 20+, Windows 10/11.

```bash
npm install
npm run dev              # Vite + Electron
npm run typecheck        # tip kontrolü
npm run build            # derleme
npm run dist             # release/ altında İKİ EXE: Setup + Portable
npm run dist:setup       # yalnızca kurulumlu
npm run dist:portable    # yalnızca portable
```

Çıktılar `release/` klasöründe:
- `TankClient-Setup-0.1.0.exe`: kurulum sihirbazı (konum seçimi, masaüstü ve Başlat menüsü kısayolu, Program Ekle/Kaldır'dan kaldırma). Yönetici izni gerektirmeden kullanıcı bazında kurulur.
- `TankClient-Portable-0.1.0.exe`: kurulum gerektirmez.

## Veri nerede tutulur?

| Sürüm | Konum |
|---|---|
| Portable | EXE'nin yanındaki `TankClient-Data` klasörü |
| Kurulumlu | `%APPDATA%\TankClient` |

Kaldırma işlemi kullanıcı verisini **silmez**. Portable'ı başka bilgisayara taşımak için EXE ile `TankClient-Data` klasörünü birlikte kopyala. Microsoft oturumu Windows hesabına bağlı şifrelendiği için (DPAPI) başka bilgisayarda açılamaz; uygulama bunu bildirir ve yeniden giriş istersin. EXE klasörü yazılamıyorsa (ör. salt okunur ortam) portable sürüm `%APPDATA%\TankClient` klasörüne düşer.

### Eski TANKmc verisi
İlk açılışta, `TankClient-Data` (veya `%APPDATA%\TankClient`) yoksa ve eski veri varsa **kopyalanır**:
- Portable: EXE'nin yanındaki `TANKmc-Data`. Yeni EXE'yi eskisiyle aynı klasöre koy; farklı klasördeyse `TANKmc-Data`'yı elle yanına kopyalayıp adını `TankClient-Data` yap.
- Kurulumlu/geliştirme: `%APPDATA%\TANKmc`.

Eski klasör hiçbir koşulda silinmez veya taşınmaz. Kopya önce geçici klasöre yapılır; yarım kalırsa sonraki açılışta yeniden denenir, başarısız olursa bir hata penceresi çıkar.

## Microsoft girişi için kurulum (ücretsiz)

1. [Azure Portal](https://portal.azure.com) → App registrations → New registration. Hesap türü: *Personal Microsoft accounts only*.
2. Authentication → *Allow public client flows* = Yes.
3. Application (client) ID değerini `electron/config.ts` içine yaz veya `TANK_CLIENT_ID` ortam değişkeniyle ver. Client ID gizli bir bilgi değildir.
4. Mojang, Minecraft servislerini yalnızca onaylı uygulamalara açıyor. https://aka.ms/AppRegReview formunu doldur; onaydan önce giriş 403 hatası verebilir.

Oturum, Windows DPAPI (Electron `safeStorage`) ile şifrelenerek saklanır; şifreleme kullanılamıyorsa diske yazılmaz.

## GitHub Actions

- `Build` (`.github/workflows/ci.yml`): `main`'e push, pull request veya elle çalıştırma (*Run workflow*). Windows'ta derler; iki ayrı artifact üretir: `TankClient-Setup` ve `TankClient-Portable` (14 gün saklanır).
- `Release` (`.github/workflows/release.yml`): `v*` etiketi gönderilince iki EXE'yi GitHub Releases'e ekler. EXE sürümü etiketten alınır (`v0.2.0` etiketi → `TankClient-Setup-0.2.0.exe`); `package.json` sürümüyle eşleşmesi gerekmez. Etiket `vX.Y.Z` biçiminde olmalı.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Genel (public) repolarda Actions ücretsizdir; özel repolarda Windows dakikaları ücretsiz kotadan 2 kat hızlı düşer. `package-lock.json` yoksa iş akışı `npm install` kullanır; ilk `npm install` sonrası oluşan kilit dosyasını commit et.

## Yapı

```
electron/   ana süreç, preload, Microsoft kimlik doğrulama, veri klasörü
src/        React arayüzü (pages, components, lib, data)
build/      uygulama ikonu
.github/    derleme ve release iş akışları
```

## Lisans

[MIT](LICENSE). Üçüncü taraf modların ve dosyaların lisansları kendi sahiplerine aittir.
