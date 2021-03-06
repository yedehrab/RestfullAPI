
var _veri = require("../veri");
var yardımcılar = require("./../../yardımcılar");
var yapılandırma = require("./../../yapılandırma");

/**
 * İşleyiciyi belirteçler
 * 
 * * Örnek: *localhost:3000/belirteçler yazıldığında bu fonksiyon çalışır. (yönlendirici ile, index.js)*
 *
 * @param {object} veri Index.js"te tanımlanan veri objesidir. İstekle gelir.
 * @param {function(number, object):void} geriCagirma İşlemler bittiği zaman verilen yanıt
 ** arg0: HTTP varsayılan durum kodları
 ** arg1: Ek bilgiler, açıklamalar
 */
belirteçler = function (veri, geriCagirma) {
    var uygunMetotlar = ["post", "get", "put", "delete"];

    if (uygunMetotlar.indexOf(veri.metot) > -1) {
        _belirteçler[veri.metot](veri, geriCagirma);
    } else {
        geriCagirma(405, { "bilgi": "Simgle işlemi için uygun metot bulunamadı :(" });
    }
};

/**
 * Belirteçleri onaylamak için kullanılan metot.
 * @param {string} belirtec Okunacak (aranacak) belirteç
 * @param {string} telefonNo Kullanıcı telefonNo numarası
 * @param {function(boolean):void} geriCagirma İşlemler bittiği zaman verilen yanıt
 ** arg0: Belirtecin onaylanma durumu
 */
belirteçler.belirteçOnaylama = function (belirtec, telefonNo, geriCagirma) {
    _veri.oku('belirteçler', belirtec, function (hata, belirteçVerisi) {
        if (!hata && belirteçVerisi) {
            // Telefon no, kimlik niyetine kullanıldığı için telefon no'ları karşılaştırıyoruz.
            if (belirteçVerisi.telefonNo == telefonNo && belirteçVerisi.ömür > Date.now()) {
                geriCagirma(true);
            } else {
                geriCagirma(false);
            }
        } else {
            geriCagirma(false);
        }
    });
};

// Belirteçler işleyicisinin alt metotları için kalıp
_belirteçler = {};

/**
 * Belirteç oluşturma metodu 
 * * Gerekli veriler: *Telefon No, Şifre*
 * * Kullanım şekli: *Yükler ile kullanılır (Body içindeki JSON verileri) (localhost:3000/belitecler)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function(number, object):void} geriCagirma İşlemler bittiği zaman verilen yanıt
 ** arg0: HTTP varsayılan durum kodları
 ** arg1: Ek bilgiler, açıklamalar
 */
_belirteçler.post = function (veri, geriCagirma) {
    // Gerekli veriler
    var telefonNo = typeof (veri.yükler.telefonNo) == "string" &&
        veri.yükler.telefonNo.trim().length == 10 ? veri.yükler.telefonNo.trim() : false;

    var şifre = typeof (veri.yükler.şifre) == "string" &&
        veri.yükler.şifre.trim().length > 0 ? veri.yükler.şifre.trim() : false;

    if (telefonNo && şifre) {
        _veri.oku("kullanıcılar", telefonNo, function (hata, kullanıcıVerisi) {
            if (!hata && kullanıcıVerisi) {
                // Alınan şifreyi gizlenmiş şifre ile karşılaştırmamız lazım.
                var gizlenmişŞifre = yardımcılar.şifreleme(şifre);

                if (gizlenmişŞifre == kullanıcıVerisi.gizlenmişŞifre) {
                    var belirteçKimliği = yardımcılar.rastgeleDizgiOluştur(yapılandırma.kimlikUzunluğu);
                    var ömür = Date.now() + 1000 * 60 * 60;

                    // Kimlik (belirtecKimligi) türkçe karakter içeremez, çünkü adres çubuğundan değer ile çağırılmaktadır. (Sorgu verisi)
                    var belirteçObjesi = {
                        "telefonNo": telefonNo,
                        "kimlik": belirteçKimliği,
                        "ömür": ömür
                    };

                    _veri.oluştur("belirteçler", belirteçKimliği, belirteçObjesi, function (hata) {
                        if (!hata) {
                            geriCagirma(200, belirteçObjesi);
                        } else {
                            geriCagirma(500, { "bilgi": "Belirteç oluşturulamadı :(" });
                        }
                    });

                } else {
                    geriCagirma(400, { "bilgi": "Belirteç oluşturmak için girilen şifre kullanıcı ile uyuşmamakta" });
                }
            } else {
                geriCagirma(400, { "bilgi": "Belirteç oluşturmak için aranan kullanıcı bulunamadı :(" });
            }
        });
    } else {
        geriCagirma(400, { "bilgi": "Belirteç oluşturmak için gerekli alanlar doldurulmadı :(" })
    }


}

/**
 * Belirteç alma metodu 
 * * Gerekli veriler: *Kimlik*
 * * Kullanım Şekli: *localhost:3000/belirteçler?kimlik=... (Sorgu verisi)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function(number, object):void} geriCagirma İşlemler bittiği zaman verilen yanıt
 ** arg0: HTTP varsayılan durum kodları
 ** arg1: Ek bilgiler, açıklamalar
 */
_belirteçler.get = function (veri, geriCagirma) {
    // Rastgele dizgi oluştur metodundaki değere eşit olmak zorunda, o sebeple yapılandırma.kimlikUzunluğu
    var kimlik = typeof (veri.sorguDizgisiObjeleri.kimlik) == "string" &&
        veri.sorguDizgisiObjeleri.kimlik.trim().length == yapılandırma.kimlikUzunluğu ? veri.sorguDizgisiObjeleri.kimlik.trim() :
        false;

    if (kimlik) {
        _veri.oku("belirteçler", kimlik, function (hata, belirteçVerisi) {
            if (!hata) {
                geriCagirma(200, belirteçVerisi);
            } else {
                geriCagirma(404, { "bilgi": "Alınacak belirteç bulunamadı :(" });
            }
        });
    } else {
        geriCagirma(400, { "bilgi": "Belirteç alma işlemi için gereken alanlar eksik :(" });
    }
}

/**
 * Belirteç güncelleme metodu 
 * * Gerekli Veriler: *Kimlik, Süre Uzatma*
 * * Kullanım şekli: *Yükler ile kullanılır (Body içindeki JSON verileri) (localhost:3000/belirtecler)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function(number, object):void} geriCagirma İşlemler bittiği zaman verilen yanıt
 ** arg0: HTTP varsayılan durum kodları
 ** arg1: Ek bilgiler, açıklamalar
 */
_belirteçler.put = function (veri, geriCagirma) {
    // İndex'te rastgele dizgi oluşturma uzunluğu ile aynı olmak zorunda (yapılandırma.kimlikUzunluğu)
    var kimlik = typeof (veri.yükler.kimlik) == 'string' &&
        veri.yükler.kimlik.trim().length == yapılandırma.kimlikUzunluğu ?
        veri.yükler.kimlik.trim() : false;

    var süreUzatma = typeof (veri.yükler.süreUzatma) == 'boolean' && veri.yükler.süreUzatma

    if (kimlik && süreUzatma) {
        _veri.oku('belirteçler', kimlik, function (hata, belirteçVerisi) {
            if (!hata) {
                if (belirteçVerisi.ömür > Date.now()) {
                    belirteçVerisi.ömür = Date.now() + 1000 * 60 * 60;

                    _veri.güncelle('belirteçler', kimlik, belirteçVerisi, function (hata) {
                        if (!hata) {
                            geriCagirma(200, { "bilgi": "Belirteç ömrü uzatıldı :)" });
                        } else {
                            geriCagirma(500, { "bilgi": "Belirteç verisi güncellenemedi :(" });
                        }
                    });
                } else {
                    geriCagirma(400, { "bilgi": "Ömrü uzatılmak istenen belirteç çoktan ölmüştür :(" });
                }
            } else {
                geriCagirma(400, { "bilgi": "Belirteç güncelleme işlemi için aranan belirteç bulunamadı :(" });
            }
        });
    } else {
        geriCagirma(400, { "bilgi": "Belirteç güncelleme işlemi için gerekli alan(lar) eksik :(" });
    }
}

/**
 * Belirteç silme metodu 
 * * Gerekli Veriler: *Kimlik*
 * * Kullanım Şekli: *localhost:3000/belirteçler?kimlik=... (Sorgu verisi)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function(number, object):void} geriCagirma İşlemler bittiği zaman verilen yanıt
 ** arg0: HTTP varsayılan durum kodları
 ** arg1: Ek bilgiler, açıklamalar
 */
_belirteçler.delete = function (veri, geriCagirma) {
    var kimlik = typeof (veri.sorguDizgisiObjeleri.kimlik) == 'string' &&
        veri.sorguDizgisiObjeleri.kimlik.trim().length == yapılandırma.kimlikUzunluğu ?
        veri.sorguDizgisiObjeleri.kimlik.trim() : false;

    if (kimlik) {
        _veri.oku('belirteçler', kimlik, function (hata) {
            if (!hata) {
                _veri.sil('belirteçler', kimlik, function (hata) {
                    if (!hata) {
                        geriCagirma(200, { "bilgi": "Belirteç başarıyla silindi :)" });
                    } else {
                        geriCagirma(500, { "bilgi": "Belirteç silme işlemi başarısız oldu :(" });
                    }
                });
            } else {
                geriCagirma(400, { "bilgi": "Silenecek belirteç bulunamadı :(" });
            }
        });
    } else {
        geriCagirma(400, { "bilgi": "Belirteç silmek için gereken alanlar eksin :(" });
    }
}

module.exports = belirteçler;