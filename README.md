# TankClient

Modern, ücretsiz ve açık kaynak bir **Minecraft Java Edition** launcher'ı. Electron, React ve TypeScript ile yazıldı; siyah-antrasit-turuncu marka kimliğine sahip.

> TankClient resmî bir Minecraft ürünü değildir; Mojang Studios veya Microsoft ile bağlantısı yoktur. Minecraft, Mojang Studios'un tescilli markasıdır. Offline/crack desteği **yoktur**: yalnızca Minecraft Java Edition'a sahip Microsoft hesaplarıyla giriş yapılır.

## Durum

| Alan | Durum |
|---|---|
| Arayüz (Ana sayfa, Kütüphane, Sunucular, Mod Kütüphanesi, Ayarlar) | Çalışır |
| Marka (TankClient), ikon, veri klasörü, eski TANKmc-Data taşıması | Yazıldı; taşıma mantığı test edildi |
| Microsoft girişi | Client ID tanımlı; gerçek hesapla test edilmedi, Minecraft servisleri için Mojang uygulama onayı gerekir |
| Vanilla başlatma (1.8.9+; resmî manifest, kütüphane/asset indirme, SHA1 doğrulama, Mojang Java) | Yazıldı; argüman mantığı test edildi, gerçek oyunla denenmedi |
| Fabric ve Quilt başlatma (resmî meta API, modlar profil klasöründen yüklenir) | Yazıldı; birleştirme mantığı test edildi, gerçek oyunla denenmedi |
| Ayarlar (RAM, çözünürlük, tam ekran, Java, oyun klasörü, küçült, otomatik güncelleme) | Kalıcı ve uygulanır; Windows ile başlat yok (kapalı gösterilir) |
| Sunucular (ekle/düzenle/sil, favori, arama, detay, canlı durum, katıl) | Durum ve oyuncu sayısı sunucudan okunur; gerçek sunucuyla denenmedi |
| Mod Kütüphanesi (Modrinth: arama, kategori, uyumluluk, bağımlılıklar, etkinleştir/devre dışı, güncelleme, .mrpack mod paketleri) | Kurulum mantığı sahte API ile test edildi; gerçek Modrinth ile denenmedi |
| Kütüphane ve profiller, Minecraft haberleri | Yazıldı; arayüz denenmedi |
| EXE (kurulumlu + portable) ve GitHub Actions | Derleme adımı çalıştı; Release yükleme `gh` ile yapılır |
| Oyuncu sayfası (gerçek skin görüntüsü, hesap bilgisi, TankClient ile oynanan gerçek süre ve geçmiş) | Yazıldı; arayüz denenmedi |
| İndirme merkezi (Minecraft, mod ve mod paketi indirmeleri: ilerleme, hız, kalan süre, iptal, geçmiş, hata) | Yazıldı; takip mantığı test edildi, gerçek indirmeyle denenmedi |
| Otomatik güncelleme (GitHub Releases: sürüm karşılaştırma, SHA-256 doğrulama, indirme merkezinde izleme, kurulumlu ve portable) | Yazıldı; karar mantığı test edildi, gerçek release ile denenmedi; `UPDATE_REPO` tanımlanmalı |
| Forge ve NeoForge ile başlatma | Henüz yok |

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

## Oyun dosyaları

OYNA, seçilen sürümü `minecraft` klasörüne (portable: `TankClient-Data\minecraft`) indirir. Java'yı Mojang'ın resmî çalışma ortamından otomatik indirir (şimdilik yalnızca 64-bit Windows). Oyun günlükleri `logs` klasörüne yazılır; erişim belirteci günlüğe yazılmaz. Microsoft girişi yapılmadan oyun başlatılmaz; offline mod yoktur.

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

## Otomatik güncelleme
1. `electron/config.ts` içindeki `UPDATE_REPO` değerine herkese açık deponu yaz (`kullanici/depo`) veya `TANK_UPDATE_REPO` ortam değişkenini ver. Boşsa güncelleme kontrolü kapalıdır.
2. Yeni sürüm için `v0.2.0` gibi bir etiket gönder; iş akışı `TankClient-Setup-0.2.0.exe`, `TankClient-Portable-0.2.0.exe` ve `TankClient-SHA256.txt` dosyalarını release'e ekler.
3. Uygulama açılışta (Ayarlar → Launcher'dan kapatılabilir) ve elle kontrol eder; daha yüksek sürüm bulursa üstte bildirim çıkar. **Güncelle** indirmeyi başlatır (İndirmeler sayfasında izlenir), SHA-256 doğrulanır, **Yeniden başlat** ile kurulur: kurulumlu sürümde kurulum sihirbazı, portable sürümde yeni EXE (eskisinin yanına indirilir) açılır. Veri klasörün korunur.
4. Doğrulama özeti olmayan (eski) sürümler otomatik kurulmaz; sürüm sayfası bağlantısı gösterilir. Beta (pre-release) sürümler ayarda açıksa dahil edilir.

## Giriş sorun giderme
Giriş adımları `logs/auth.log` dosyasına yazılır (belirteç yazılmaz): portable sürümde `TankClient-Data\logs\auth.log`, kurulumlu sürümde `%APPDATA%\TankClient\logs\auth.log`. Sorun bildirirken bu dosyanın son satırlarını paylaş.

## Microsoft girişi için kurulum (ücretsiz)

1. [Azure Portal](https://portal.azure.com) → App registrations → New registration. Hesap türü: *Personal Microsoft accounts only*.
2. Authentication → *Allow public client flows* = Yes.
3. Application (client) ID değeri `electron/config.ts` içindedir (gizli değildir). Kendi kaydını kullanacaksan oraya yaz veya `TANK_CLIENT_ID` ortam değişkeniyle ver.
   Authentication → *Supported account types* kişisel Microsoft hesaplarını içermelidir.
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
