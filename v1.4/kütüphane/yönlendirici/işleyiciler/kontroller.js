
var belirteçler = require("./belirteçler");
var _veri = require("./../veri");
var yapılandırma = require("./../../yapılandırma");
var yardımcılar = require("./../../yardımcılar");

kontroller = function (veri, geriCagirma) {
    var uygunMetotlar = ["post", "get", "put", "delete"];

    if (uygunMetotlar.indexOf(veri.metot) > -1) {
        _kontroller[veri.metot](veri, geriCagirma);
    } else {
        geriCagirma(405, { "bilgi": "Kontrol işlemleri için metot uygun değil :(" });
    }
};

_kontroller = {};

/**
 * Kontrol oluşturma metodu 
 * * Gerekli veriler: *Protokol, url, metot, başarı kodları, zaman aşımı*
 * * Kullanım şekli: *Yükler ile kullanılır (Body içindeki JSON verileri) (localhost:3000/kontroller)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function} geriCagirma - *(durumKodu, yükler)* İşlemler bittikten sonra verilen yanıtlar.
 */
_kontroller.post = function (veri, geriCagirma) {
    // Gerekli veriler
    var protokol = typeof (veri.yükler.protokol) == 'string' &&
        ["http", "https"].indexOf(veri.yükler.protokol) > -1 ?
        veri.yükler.protokol : false;

    var url = typeof (veri.yükler.url) == 'string' &&
        veri.yükler.url.trim().length > 0 ?
        veri.yükler.url.trim() : false;

    var metot = typeof (veri.yükler.metot) == 'string' &&
        ["post", "get", "put", "delete"].indexOf(veri.yükler.metot) > -1 ?
        veri.yükler.metot : false;

    var başarıKodları = typeof (veri.yükler.başarıKodları) == 'object' &&
        veri.yükler.başarıKodları instanceof Array &&
        veri.yükler.başarıKodları.length > 0 ?
        veri.yükler.başarıKodları : false;

    var zamanAşımı = typeof (veri.yükler.zamanAşımı) == 'number' &&
        veri.yükler.zamanAşımı % 1 === 0 && // (?)
        veri.yükler.zamanAşımı >= 1 &&
        veri.yükler.zamanAşımı <= 5 ?
        veri.yükler.zamanAşımı : false;

    if (protokol && url && metot && başarıKodları && zamanAşımı) {
        // Sadece tanınmış kullanıclar kontrol yapabilsin diye belirtece bakıyoruz.
        var belirteç = typeof (veri.başlıklar.belirtec) == 'string' ?
            veri.başlıklar.belirtec : false;
        console.log(veri.başlıklar.belirtec);

        if (belirteç) {
            _veri.oku('belirteçler', belirteç, function (hata, belirteçVerisi) {
                if (!hata && belirteçVerisi) {
                    var telefonNo = belirteçVerisi.telefonNo;

                    _veri.oku('kullanıcılar', telefonNo, function (hata, kullanıcıVerisi) {
                        if (!hata && kullanıcıVerisi) {
                            var kullanıcıKontrolKimlikleri = typeof (kullanıcıVerisi.kontrolKimlikleri) == 'object' &&
                                kullanıcıVerisi.kontrolKimlikleri instanceof Array ?
                                kullanıcıVerisi.kontrolKimlikleri : [];

                            // Kullanıcının kontrol hakkının olup olmadığı kontrol ediliyor.
                            if (kullanıcıKontrolKimlikleri.length < yapılandırma.enFazlaKontrol) {
                                // Rastgele kontrol kimliği oluşturuyoruz.
                                var kontrolKimliği = yardımcılar.rastgeleDizgiOluştur(yapılandırma.kimlikUzunluğu);

                                // Adress çubuğuna yazıldığı için (Sorgu Verisi), kimlik türkçe karakter içeremez. 
                                var kontrolObjesi = {
                                    "kimlik": kontrolKimliği,
                                    "telefonNo": telefonNo,
                                    "protokol": protokol,
                                    "url": url,
                                    "metot": metot,
                                    "başarıKodları": başarıKodları,
                                    "zamanAşımı": zamanAşımı
                                };

                                _veri.oluştur("kontroller", kontrolKimliği, kontrolObjesi, function (hata) {
                                    if (!hata) {
                                        // İlk başta boş olduğundan, atama yapmamız gerekebilir. (?) [Array mi değil mi belli değil.]
                                        kullanıcıVerisi.kontrolKimlikleri = kullanıcıKontrolKimlikleri;
                                        kullanıcıVerisi.kontrolKimlikleri.push(kontrolKimliği);

                                        _veri.güncelle("kullanıcılar", telefonNo, kullanıcıVerisi, function (hata) {
                                            if (!hata) {
                                                geriCagirma(200, kontrolObjesi);
                                            } else {
                                                geriCagirma(500, { "bilgi": "Kullanıcı kontrol objesi güncellenemedi :(" });
                                            }
                                        });
                                    } else {
                                        geriCagirma(500, { "bilgi": "Kontrol oluşturulamadı :(" });
                                    }
                                });
                            } else {
                                geriCagirma(400, { "bilgi": "Bütün kontrol hakklarını (" + yapılandırma.enFazlaKontrol + ") kullanmış bulunmaktasın :(" });
                            }

                        } else {
                            geriCagirma(403, { "bilgi": "Kontrol işlemi (post) için kullanıcı düzgün okunamadı :(" });
                        }
                    });
                } else {
                    geriCagirma(403, { "bilgi": "Kontrol işlemi (post) için gerekli belirteç düzgün okunamadı :(" });
                }
            });
        } else {
            geriCagirma(400, { "bilgi": "Kontrol işlemi (post) yapabilmek için tanınmış bir kullanıcı değilsiniz :(" });
        }
    } else {
        geriCagirma(400, { "bilgi": "Kontrol işlemi (post) için gerekli alanlar hatalı veya eksik :(" });
    }
};

/**
 * Kontrol alma metodu 
 *
 * * Gerekli veriler: *Kimlik*
 * * Kullanım şekli: *localhost:3000/kontroller?kimlik=... (Sorgu Verisi)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function} geriCagirma - *(durumKodu, yükler)* İşlemler bittikten sonra verilen yanıtlar.
 */
_kontroller.get = function (veri, geriCagirma) {
    // Gerekli veriler
    var kimlik = typeof (veri.sorguDizgisiObjeleri.kimlik) == "string" &&
        veri.sorguDizgisiObjeleri.kimlik.trim().length == yapılandırma.kimlikUzunluğu ?
        veri.sorguDizgisiObjeleri.kimlik.trim() : false;

    if (kimlik) {
        _veri.oku("kontroller", kimlik, function (hata, kontrolVerisi) {
            if (!hata && kontrolVerisi) {
                var belirteç = typeof (veri.başlıklar.belirtec) == "string" ?
                    veri.başlıklar.belirtec : false;

                belirteçler.belirteçOnaylama(belirteç, kontrolVerisi.telefonNo, function (belirteçOnaylandıMı) {
                    if (belirteçOnaylandıMı) {
                        geriCagirma(200, kontrolVerisi);
                    } else {
                        geriCagirma(200, { "bilgi": "Kontrol alma işlemi için belirteç onaylanamadı :(" });
                    }
                });
            } else {
                geriCagirma(404, { "bilgi": "Kontroller okunurken hata oluştu :(" });
            }
        });
    } else {
        geriCagirma(200, { "bilgi": "Kontrol alma işlemi için gerekli alanlar eksik :(" });
    }


};

/**
 * Kontrol güncelleme metodu 
 * * Gerekli veriler: *Kimlik*
 * * İsteğe bağlı veriler: *Protokol, url, metot, başarı kodları, zaman aşımı*
 * * Kullanım şekli: *Yükler ile kullanılır (Body içindeki JSON verileri) (localhost:3000/kontroller)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function} geriCagirma - *(durumKodu, yükler)* İşlemler bittikten sonra verilen yanıtlar.
 */
_kontroller.put = function (veri, geriCagirma) {
    // Gerekli veriler
    var kimlik = typeof (veri.yükler.kimlik) == "string" &&
        veri.yükler.kimlik.trim().length == yapılandırma.kimlikUzunluğu ?
        veri.yükler.kimlik.trim() : false;

    // İsteğe bağlı veriler
    var protokol = typeof (veri.yükler.protokol) == "string" &&
        ["http", "https"].indexOf(veri.yükler.protokol) > -1 ?
        veri.yükler.protokol : false;
    var url = typeof (veri.yükler.url) == "string" &&
        veri.yükler.url.trim().length > 0 ?
        veri.yükler.url.trim() : false;
    var metot = typeof (veri.yükler.metot) == "string" &&
        ["post", "get", "put", "delete"].indexOf(veri.yükler.metot) > -1 ?
        veri.yükler.metot : false;
    var başarıKodları = typeof (veri.yükler.başarıKodları) == "object" &&
        veri.yükler.başarıKodları instanceof Array &&
        veri.yükler.başarıKodları.length > 0 ?
        veri.yükler.başarıKodları : false;
    var zamanAşımı = typeof (veri.yükler.zamanAşımı) == "number" &&
        veri.yükler.zamanAşımı % 1 === 0 && // (?)
        veri.yükler.zamanAşımı >= 1 &&
        veri.yükler.zamanAşımı <= 5 ?
        veri.yükler.zamanAşımı : false;

    // Eğer gerekli bilgiler verilmemişse hata vereceğiz.
    if (kimlik) {
        // İsteğe bağlı veriler yoksa, hata vereceğiz.
        if (protokol || url || metot || başarıKodları || zamanAşımı) {
            _veri.oku("kontroller", kimlik, function (hata, kontrolVerisi) {
                if (!hata && kontrolVerisi) {
                    var belirteç = typeof (veri.başlıklar.belirtec) == "string" ?
                        veri.başlıklar.belirtec : false;

                    belirteçler.belirteçOnaylama(belirteç, kontrolVerisi.telefonNo, function (belirteçOnaylandıMı) {
                        if (belirteçOnaylandıMı) {
                            // Gereken kontrolleri güncelleme
                            if (protokol) {
                                kontrolVerisi.protokol = protokol;
                            }
                            if (url) {
                                kontrolVerisi.url = url;
                            }
                            if (metot) {
                                kontrolVerisi.metot = metot;
                            }
                            if (başarıKodları) {
                                kontrolVerisi.başarıKodları = başarıKodları;
                            }
                            if (zamanAşımı) {
                                kontrolVerisi.zamanAşımı = zamanAşımı;
                            }

                            // Yenilikleri kaydetme
                            _veri.güncelle("kontroller", kimlik, kontrolVerisi, function (hata) {
                                if (!hata) {
                                    geriCagirma(200);
                                } else {
                                    geriCagirma(500, { "bilgi": "Kontrol güncelleme işleminde hata meydana geldi :(" });
                                }
                            });

                        } else {
                            geriCagirma(403, { "bilgi": "Kontrol güncelleme işlemi için belirteç onaylanmadı :(" });
                        }
                    });

                } else {
                    geriCagirma(400, { "bilgi": "Kontrol güncelleme işlemi için no mevcut değil :(" });
                }
            });
        } else {
            geriCagirma(400, { "bilgi": "Kontrol güncelleme işlemi için veriler mevcut değil :(" });
        }
    } else {
        geriCagirma(400, { "bilgi": "Kontrol güncelleme işlemi için gerekli alanlar eksik :(" });
    }
}

/**
 * Kontrol silme metodu 
 * * Gerekli veriler: *Kimlik*
 * * Kullanım Şekli: *localhost:3000/kontroller?kimlik=... (Sorgu Verisi)*
 * @param {object} veri Index.js"te tanımlanan veri objesi. İstekle gelir.
 * @param {function} geriCagirma - *(durumKodu, yükler)* İşlemler bittikten sonra verilen yanıtlar.
 */
_kontroller.delete = function (veri, geriCagirma) {
    // Gerekli veriler 
    // (trim işlemi dizgideki boşlukları kırpar.)
    var kimlik = typeof (veri.sorguDizgisiObjeleri.kimlik) == "string" &&
        veri.sorguDizgisiObjeleri.kimlik.trim().length == yapılandırma.kimlikUzunluğu ?
        veri.sorguDizgisiObjeleri.kimlik : false;

    if (kimlik) {
        // Kimliği kontrol etmek amaçlı okuyoruz
        _veri.oku("kontroller", kimlik, function (hata, kontrolVerisi) {
            if (!hata && kontrolVerisi) {
                // Kullanıcı doğrulama işlemi
                var belirteç = typeof (veri.başlıklar.belirtec) == "string" ?
                    veri.başlıklar.belirtec : false;

                belirteçler.belirteçOnaylama(belirteç, kontrolVerisi.telefonNo, function (belirteçOnaylandıMı) {
                    if (belirteçOnaylandıMı) {
                        // Kontrol verisi siliyoruz.
                        _veri.sil("kontroller", kimlik, function (hata) {
                            if (!hata) {
                                // Kullanıcının kontrol kimlikleri güncellenmeli
                                _veri.oku("kullanıcılar", kontrolVerisi.telefonNo, function (hata, kullanıcıVerisi) {
                                    if (!hata && kullanıcıVerisi) {
                                        // Kullanıcının kontrollerinin kimlik bilgilerini alıyoruz.
                                        var kullanıcıKontrolKimlikleri = typeof (kullanıcıVerisi.kontrolKimlikleri) == "object" &&
                                            kullanıcıVerisi.kontrolKimlikleri instanceof Array ?
                                            kullanıcıVerisi.kontrolKimlikleri : [];

                                        // Kullanıcı verisideki silinen kontrol kimliğinin pozisyonunu alıyoruz.
                                        var kontrolKimliğiPozisyonu = kullanıcıVerisi.kontrolKimlikleri.indexOf(kimlik);

                                        if (kontrolKimliğiPozisyonu > -1) {
                                            // Kontrol kimliğini siliyoruz.
                                            kullanıcıKontrolKimlikleri.splice(kontrolKimliğiPozisyonu, 1);

                                            // Kullanıcı kontrol kimliği objesini güncelliyoruz.
                                            kullanıcıVerisi.kontrolKimlikleri = kullanıcıKontrolKimlikleri;

                                            _veri.güncelle("kullanıcılar", kontrolVerisi.telefonNo, kullanıcıVerisi, function (hata) {
                                                if (!hata) {
                                                    geriCagirma(200, { "bilgi": "Kontrol başarıyla silindi :)" });
                                                } else {
                                                    geriCagirma(500, { "bilgi": "Kullanıcı güncellenemedi :(" });
                                                }
                                            });
                                        } else {
                                            geriCagirma(500, {
                                                "bilgi": "Silinen kontrol verisinin bilgisi kullanıcıda bulunamadı " +
                                                    " bu sebeple silinemedi :("
                                            });
                                        }

                                    } else {
                                        geriCagirma(500, {
                                            "bilgi": "Kontrol verisi silinen kullanıcı bulunamadı. Bu sebeple kullanıcı " +
                                                "kontrol verileri güncellenemedi  :("
                                        });
                                    }
                                });
                            } else {
                                geriCagirma(500, { "bilgi": "Kontrol verisi silme işleminde hata oluştu :(" });
                            }
                        });
                    } else {
                        geriCagirma(403, { "bilgi": "Doğrulanmış bir kullanıcı değilsiniz :(" });
                    }
                });
            } else {
                geriCagirma(400, { "bilgi": "Kimlik bulunamadı :(" });
            }
        });
    } else {
        geriCagirma(400, { "bilgi": "Kimlik geçerli değil :(" });
    }
};

module.exports = kontroller;