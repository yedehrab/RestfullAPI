/**
 * @todo Yenkimliken adlandır.
 */

import {
    listele as verileriListele,
    oku as verileriOku
} from "./veri"
import { kimlikUzunluğu } from "./yapılandırma"
import { parse as ayrıştır } from "url"
import { request as httpİsteği } from 'http';
import { request as httpsİsteği } from 'https';
import { güncelle as verileriGüncelle } from './veri';

const işçiler = {};

/**
 * * Not: *Arka plan işlemi olduğu için durum kodu göndermemize veya
 * geri çağırma oluşturumuza gerek yok.*
 */
işçiler.bütünKontrolleriAl = () => {
    console.log("Kontrol alma sırasındayız..");
    verileriListele("kontroller", (hata, kontroller) => {
        if (!hata && kontroller && kontroller.length > 0) {
            kontroller.forEach(kontrol => {
                // Her bir kontrolü okuma
                verileriOku("kontroller", kontrol, (hata, orjKontrolVerisi) => {
                    if (!hata && orjKontrolVerisi) {
                        işçiler.kontrolVerisiniOnayla(orjKontrolVerisi);
                    } else {
                        console.log("Kontrol verisi okunamadı");
                    }
                });
            });
        } else {
            console.log("Hata: İşlenecek kontrol bulunamadı :(");
        }
    });
};

işçiler.kontrolVerisiniOnayla = kontrolVerisi => {
    kontrolVerisi = typeof (kontrolVerisi) == "object" &&
        kontrolVerisi !== null
        ? kontrolVerisi
        : {};

    kontrolVerisi.kimlik = typeof (kontrolVerisi.kimlik) == "string" &&
        kontrolVerisi.kimlik.trim().length == kimlikUzunluğu
        ? kontrolVerisi.kimlik.trim()
        : false;

    kontrolVerisi.telefonNo = typeof (kontrolVerisi.telefonNo) == "string" &&
        kontrolVerisi.telefonNo.trim().length == 10
        ? kontrolVerisi.telefonNo.trim()
        : false;

    kontrolVerisi.protokol = typeof (kontrolVerisi.protokol) == "string" &&
        ["http", "https"].indexOf(kontrolVerisi.protokol) > -1
        ? kontrolVerisi.protokol.trim()
        : false;

    kontrolVerisi.url = typeof (kontrolVerisi.url) == "string" &&
        kontrolVerisi.url.trim().length > 0
        ? kontrolVerisi.url.trim()
        : false;

    kontrolVerisi.metot = typeof (kontrolVerisi.metot) == "string" &&
        ["post", "get", "put", "delete"].indexOf(kontrolVerisi.metot) > -1
        ? kontrolVerisi.metot.trim()
        : false;

    kontrolVerisi.başarıKodları = typeof (kontrolVerisi.başarıKodları) == "object" &&
        kontrolVerisi.başarıKodları instanceof Array &&
        kontrolVerisi.başarıKodları.length > 0
        ? kontrolVerisi.başarıKodları
        : false;

    kontrolVerisi.zamanAşımı = typeof (kontrolVerisi.zamanAşımı) == "number" &&
        kontrolVerisi.zamanAşımı % 1 === 0 &&
        kontrolVerisi.zamanAşımı >= 1 &&
        kontrolVerisi.zamanAşımı <= 5
        ? kontrolVerisi.zamanAşımı
        : false;

    // Aktif mi pasif mi kontrolü
    kontrolVerisi.durum = "string" &&
        ["post", "get", "put", "delete"].indexOf(kontrolVerisi.durum) > -1
        ? kontrolVerisi.durum.trim()
        : "down";

    kontrolVerisi.sonKontrol = typeof (kontrolVerisi.sonKontrol) == "number" &&
        kontrolVerisi.sonKontrol > 0
        ? kontrolVerisi.url.trim()
        : false;

    // Eğer bütün kontroller geçilirse, bir sonraki adıma geçilecek
    if (
        kontrolVerisi.kimlik &&
        kontrolVerisi.telefonNo &&
        kontrolVerisi.protokol &&
        kontrolVerisi.url &&
        kontrolVerisi.metot &&
        kontrolVerisi.başarıKodları &&
        kontrolVerisi.zamanAşımı
    ) {
       işçiler.kontrolEt(kontrolVerisi);
    } else {
        console.log("Hata: Kontrollerden biri düzgün formatlanmamış, bu adım atlanıyor.");
    }

}

işçiler.kontrolEt = kontrolVerisi => {
    // Kontrol sonucu için obje tanımlıyoruz.
    const kontrolSonucu = {
        hata: false,
        yanıtKodu: false
    }

    // Sonucun gönderip gönderilmediği bilgisi
    let sonuçGönderildi = false;

    // Kontrol verisinden yolu ve sunucu adını ayrıştırıyoruz.
    const ayrıştırılmışUrl = ayrıştır(`${kontrolVerisi.protokol}://${kontrolVerisi.url}`, true);
    const barındırıcıİsmi = ayrıştırılmışUrl.hostname;
    // Pathname yerine path kullanıyoruz, çünkü bize sorgu (query) dizgisi lazım.
    const yol = ayrıştırılmışUrl.path;

    // İsteği oluşturma (Türkçeleştirilemez ögeler sabittir.)
    const istekDetayları = {
        protokol: kontrolVerisi.protokol + ":",
        hostname: barındırıcıİsmi,
        method: kontrolVerisi.metot.toUpperCase(),
        path: yol,
        timeout: kontrolVerisi.zamanAşımı * 1000
    };

    // İstek objesini HTTP / HTTP modülünde oluşturuyoruz
    const _istekTürü = kontrolVerisi.protokol == "http"
        ? httpİsteği
        : httpsİsteği;

    const istek = _istekTürü(istekDetayları, yanıt => {
        // Verilen yanıtım durum kodunu kontrol sonucumuza ekliyoruz
        kontrolSonucu.yanıtKodu = yanıt.statusCode;

        if (!sonuçGönderildi) {
            işçiler.kontrolSonucunuİşle(kontrolVerisi, kontrolSonucu);
            sonuçGönderildi = true;
        }
    });

    // Hata durumunda yapılacak olaylar
    istek.on("error", hata => {
        // Kontrol sonucunu güncelleyoruz
        kontrolSonucu.hata = {
            hata: true,
            bilgi: hata
        };

        işçiler.kontrolSonucunuİşle(kontrolVerisi, kontrolSonucu);
    });

    // Süre dolduğunda yapılacak olaylar
    istek.on("timeout", hata => {
        // Kontrol sonucunu güncelleyoruz
        kontrolSonucu.hata = {
            hata: true,
            bilgi: "süre doldu"
        };

        if (!sonuçGönderildi) {
            işçiler.kontrolSonucu(kontrolVerisi, kontrolSonucu);
            sonuçGönderildi = true;
        }
    });

    // İsteği bitiriyoruz
    istek.end();
}

/**
 * Kontrol sonucunu işleme, eğer gerekliyse güncelleme ve gerekli uyarıları tetikleme
 * * Not: *Sadece durumun değişmesi olayını bildirir.*
 */
işçiler.kontrolSonucunuİşle = (kontrolVerisi, kontrolSonucu) => {
    console.log(`Durum Kodu: ${kontrolSonucu.yanıtKodu}`);

    // Kontrolün akitf veya pasif olduğuna karar verme
    const durum = !kontrolSonucu.hata &&
        kontrolSonucu.yanıtKodu &&
        kontrolVerisi.başarıKodları.indexOf(kontrolSonucu.yanıtKodu) > -1
        ? "aktif"
        : "pasif";

    // Değişimden emin olma ve bildirim verme
    const bildirilmeli = kontrolVerisi.sonKontrol &&
        kontrolVerisi.durum !== durum
        ? true
        : false;

    // Kontrol verisini güncelleme
    const yeniKontrolVerisi = kontrolVerisi;
    yeniKontrolVerisi.durum = durum;
    yeniKontrolVerisi.sonKontrol = Date.now();

    // Kontrol dosyasını güncelleme
    verileriGüncelle("kontroller", yeniKontrolVerisi.kimlik, yeniKontrolVerisi, hata => {
        if (!hata) {
            // Yeni kontorl verisi işlemin bir sonraki adımına aktarma
            if (bildirilmeli) {
                işçiler.kullanıcıyaBildir(yeniKontrolVerisi);
            } else {
                console.log("Kontrol sonucu eskisinden farklı değil, kullanıcıya bildirim yapılmadı ;)");
            }
        } else {
            console.log("Kontrollerden birini güncellerken hata oluştu :(");
        }
    });
}

/**
 * Kullanıcıya durum değişikliğini bildirir
 */
işçiler.kullanıcıyaBildir = kontrolVerisi => {
    const msj = `Uyarı: ${kontrolVerisi.metot} kontrolü için ${kontrolVerisi.protokol}://${kontrolVerisi.url} şu anlık ile ${kontrolVerisi.durum}`;
    console.log(`Kullanıcıya "${msj}" bildirildi.`);

}

/*
**
* İşçilerin her dakikada başı çalışma döngüsü
*/
işçiler.tekrarla = () => {
    setInterval(() => {
        işçiler.bütünKontrolleriAl();
    }, 1000 * 10);
};

// İşçiler'i başlatma
export function başlat() {
    // Bütün kontrolleri hızlı bir şekilde derliyoruz.
    işçiler.bütünKontrolleriAl();
    işçiler.tekrarla();
}

export default işçiler;