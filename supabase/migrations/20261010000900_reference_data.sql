-- Partivo.az — production reference data (roles, settings, packages, locations, catalog, content).
-- All of it is editable later from the admin dashboard; nothing here is sample/demo data.

-- Permissions -----------------------------------------------------------------
insert into public.role_permissions (role, permission) values
  ('super_admin', 'dashboard.view'), ('super_admin', 'users.view'), ('super_admin', 'users.suspend'),
  ('super_admin', 'users.verify'), ('super_admin', 'listings.view_all'), ('super_admin', 'listings.moderate'),
  ('super_admin', 'reports.view'), ('super_admin', 'reports.manage'), ('super_admin', 'catalog.manage'),
  ('super_admin', 'packages.manage'), ('super_admin', 'payments.view'), ('super_admin', 'payments.manage'),
  ('super_admin', 'settings.manage'), ('super_admin', 'content.manage'), ('super_admin', 'support.manage'),
  ('super_admin', 'audit.view'), ('super_admin', 'staff.manage'),

  ('moderator', 'dashboard.view'), ('moderator', 'users.view'), ('moderator', 'users.suspend'),
  ('moderator', 'users.verify'), ('moderator', 'listings.view_all'), ('moderator', 'listings.moderate'),
  ('moderator', 'reports.view'), ('moderator', 'reports.manage'), ('moderator', 'catalog.manage'),

  ('support', 'dashboard.view'), ('support', 'users.view'), ('support', 'listings.view_all'),
  ('support', 'reports.view'), ('support', 'payments.view'), ('support', 'support.manage')
on conflict do nothing;

-- Settings --------------------------------------------------------------------
insert into public.app_settings (key, value, description, is_public) values
  ('listings',
   '{"duration_days": 30, "renewal_window_days": 5, "max_active_per_user": 50, "min_photos": 5, "max_photos": 10, "require_moderation": true}',
   'Elan müddəti, yeniləmə pəncərəsi, limitlər, foto sayı və moderasiya', true),
  ('homepage',
   '{"sections": {"premium": true, "vip": true, "recent": true, "categories": true, "makes": true, "business": true}, "popular_searches": ["Fara", "Əyləc kolodkası", "Amortizator", "Akkumulyator", "Generator", "Radiator", "Bamper", "Yağ filtri"]}',
   'Ana səhifə bölmələri və populyar axtarışlar', true)
on conflict (key) do nothing;

-- Promotion packages (prices are configurable in the admin panel) --------------
insert into public.promotion_packages (code, name, description, features, price, duration_days, placements, sort_order) values
  ('top', 'TOP', 'Elanınız axtarış nəticələrində və kateqoriya siyahılarında yuxarıda göstərilir.',
   array['Axtarışda ön sıralarda', 'Rəngli vurğu', 'TOP nişanı'], 3.00, 3, array['search_top', 'highlight'], 10),
  ('vip', 'VIP', 'Elanınız VIP bölməsində və axtarışda önə çıxır.',
   array['VIP bölməsində yer', 'Axtarışda ön sıralarda', 'VIP nişanı'], 7.00, 7, array['vip_section', 'search_top', 'highlight'], 20),
  ('premium', 'PREMIUM', 'Maksimum görünürlük: ana səhifədə, VIP bölməsində və axtarışda.',
   array['Ana səhifədə xüsusi blok', 'VIP bölməsində yer', 'Axtarışda ön sıralarda', 'PREMIUM nişanı'], 15.00, 7,
   array['homepage', 'vip_section', 'search_top', 'highlight'], 30)
on conflict (code) do nothing;

-- Cities and districts grouped by Azerbaijan's economic regions (2021 division) -----
insert into public.cities (slug, name, region, sort_order) values
  ('baki', 'Bakı', 'Bakı', 1),
  ('sumqayit', 'Sumqayıt', 'Abşeron-Xızı', 2),
  ('abseron', 'Abşeron', 'Abşeron-Xızı', 50),
  ('xizi', 'Xızı', 'Abşeron-Xızı', 50),
  ('gence', 'Gəncə', 'Gəncə-Daşkəsən', 3),
  ('naftalan', 'Naftalan', 'Gəncə-Daşkəsən', 50),
  ('daskesen', 'Daşkəsən', 'Gəncə-Daşkəsən', 50),
  ('goygol', 'Göygöl', 'Gəncə-Daşkəsən', 50),
  ('goranboy', 'Goranboy', 'Gəncə-Daşkəsən', 50),
  ('samux', 'Samux', 'Gəncə-Daşkəsən', 50),
  ('mingecevir', 'Mingəçevir', 'Mərkəzi Aran', 4),
  ('yevlax', 'Yevlax', 'Mərkəzi Aran', 50),
  ('agdas', 'Ağdaş', 'Mərkəzi Aran', 50),
  ('goycay', 'Göyçay', 'Mərkəzi Aran', 50),
  ('kurdemir', 'Kürdəmir', 'Mərkəzi Aran', 50),
  ('ucar', 'Ucar', 'Mərkəzi Aran', 50),
  ('zerdab', 'Zərdab', 'Mərkəzi Aran', 50),
  ('sirvan', 'Şirvan', 'Şirvan-Salyan', 5),
  ('bilesuvar', 'Biləsuvar', 'Şirvan-Salyan', 50),
  ('haciqabul', 'Hacıqabul', 'Şirvan-Salyan', 50),
  ('neftcala', 'Neftçala', 'Şirvan-Salyan', 50),
  ('salyan', 'Salyan', 'Şirvan-Salyan', 50),
  ('lenkeran', 'Lənkəran', 'Lənkəran-Astara', 6),
  ('astara', 'Astara', 'Lənkəran-Astara', 50),
  ('celilabad', 'Cəlilabad', 'Lənkəran-Astara', 50),
  ('lerik', 'Lerik', 'Lənkəran-Astara', 50),
  ('masalli', 'Masallı', 'Lənkəran-Astara', 50),
  ('yardimli', 'Yardımlı', 'Lənkəran-Astara', 50),
  ('seki', 'Şəki', 'Şəki-Zaqatala', 7),
  ('balaken', 'Balakən', 'Şəki-Zaqatala', 50),
  ('qax', 'Qax', 'Şəki-Zaqatala', 50),
  ('qebele', 'Qəbələ', 'Şəki-Zaqatala', 50),
  ('oguz', 'Oğuz', 'Şəki-Zaqatala', 50),
  ('zaqatala', 'Zaqatala', 'Şəki-Zaqatala', 50),
  ('quba', 'Quba', 'Quba-Xaçmaz', 8),
  ('qusar', 'Qusar', 'Quba-Xaçmaz', 50),
  ('xacmaz', 'Xaçmaz', 'Quba-Xaçmaz', 50),
  ('sabran', 'Şabran', 'Quba-Xaçmaz', 50),
  ('siyezen', 'Siyəzən', 'Quba-Xaçmaz', 50),
  ('samaxi', 'Şamaxı', 'Dağlıq Şirvan', 9),
  ('agsu', 'Ağsu', 'Dağlıq Şirvan', 50),
  ('ismayilli', 'İsmayıllı', 'Dağlıq Şirvan', 50),
  ('qobustan', 'Qobustan', 'Dağlıq Şirvan', 50),
  ('naxcivan', 'Naxçıvan', 'Naxçıvan', 10),
  ('babek', 'Babək', 'Naxçıvan', 50),
  ('culfa', 'Culfa', 'Naxçıvan', 50),
  ('kengerli', 'Kəngərli', 'Naxçıvan', 50),
  ('ordubad', 'Ordubad', 'Naxçıvan', 50),
  ('sederek', 'Sədərək', 'Naxçıvan', 50),
  ('sahbuz', 'Şahbuz', 'Naxçıvan', 50),
  ('serur', 'Şərur', 'Naxçıvan', 50),
  ('xankendi', 'Xankəndi', 'Qarabağ', 11),
  ('agcabedi', 'Ağcabədi', 'Qarabağ', 50),
  ('agdam', 'Ağdam', 'Qarabağ', 50),
  ('berde', 'Bərdə', 'Qarabağ', 50),
  ('fuzuli', 'Füzuli', 'Qarabağ', 50),
  ('xocali', 'Xocalı', 'Qarabağ', 50),
  ('xocavend', 'Xocavənd', 'Qarabağ', 50),
  ('susa', 'Şuşa', 'Qarabağ', 50),
  ('terter', 'Tərtər', 'Qarabağ', 50),
  ('cebrayil', 'Cəbrayıl', 'Şərqi Zəngəzur', 50),
  ('kelbecer', 'Kəlbəcər', 'Şərqi Zəngəzur', 50),
  ('qubadli', 'Qubadlı', 'Şərqi Zəngəzur', 50),
  ('lacin', 'Laçın', 'Şərqi Zəngəzur', 50),
  ('zengilan', 'Zəngilan', 'Şərqi Zəngəzur', 50),
  ('agstafa', 'Ağstafa', 'Qazax-Tovuz', 50),
  ('gedebey', 'Gədəbəy', 'Qazax-Tovuz', 50),
  ('qazax', 'Qazax', 'Qazax-Tovuz', 50),
  ('semkir', 'Şəmkir', 'Qazax-Tovuz', 50),
  ('tovuz', 'Tovuz', 'Qazax-Tovuz', 50),
  ('beyleqan', 'Beyləqan', 'Mil-Muğan', 50),
  ('imisli', 'İmişli', 'Mil-Muğan', 50),
  ('saatli', 'Saatlı', 'Mil-Muğan', 50),
  ('sabirabad', 'Sabirabad', 'Mil-Muğan', 50)
on conflict (slug) do nothing;

-- Categories ------------------------------------------------------------------
with parents (slug, name, icon, sort_order) as (
  values
    ('muherrik', 'Mühərrik', 'engine', 10),
    ('transmissiya', 'Transmissiya', 'gearbox', 20),
    ('asqi-ve-sukan', 'Asqı və sükan', 'suspension', 30),
    ('eylec-sistemi', 'Əyləc sistemi', 'brake', 40),
    ('kuzov', 'Kuzov hissələri', 'body', 50),
    ('optika', 'Optika və işıqlar', 'light', 60),
    ('elektrik', 'Elektrik və elektronika', 'battery', 70),
    ('soyutma', 'Soyutma və kondisioner', 'cooling', 80),
    ('yanacaq-ve-islenmis-qaz', 'Yanacaq və işlənmiş qaz sistemi', 'fuel', 90),
    ('filtrler-ve-yaglar', 'Filtrlər, yağlar və mayelər', 'filter', 100),
    ('sinler-ve-diskler', 'Şinlər və disklər', 'wheel', 110),
    ('salon', 'Salon', 'seat', 120),
    ('aksesuarlar', 'Aksesuarlar', 'accessory', 130)
)
insert into public.categories (slug, name, icon, sort_order)
select slug, name, icon, sort_order from parents
on conflict (slug) do nothing;

with children (parent_slug, slug, name, sort_order) as (
  values
    ('muherrik', 'muherrik-bloku-ve-basligi', 'Mühərrik bloku və başlığı', 10),
    ('muherrik', 'porsen-qrupu', 'Porşen qrupu', 20),
    ('muherrik', 'qaz-paylayici-mexanizm', 'Qaz paylayıcı mexanizm', 30),
    ('muherrik', 'muherrik-yastiqlari', 'Mühərrik yastıqları', 40),
    ('muherrik', 'turbo-kompressorlar', 'Turbokompressorlar', 50),
    ('transmissiya', 'suretler-qutusu', 'Sürətlər qutusu', 10),
    ('transmissiya', 'mufta', 'Mufta (ilişmə)', 20),
    ('transmissiya', 'kardan-ve-yarimoxlar', 'Kardan və yarımoxlar', 30),
    ('asqi-ve-sukan', 'amortizatorlar', 'Amortizatorlar', 10),
    ('asqi-ve-sukan', 'ricaqlar-ve-sarovoylar', 'Rıçaqlar və şarovoylar', 20),
    ('asqi-ve-sukan', 'sukan-mexanizmi', 'Sükan mexanizmi', 30),
    ('asqi-ve-sukan', 'yaylar', 'Yaylar', 40),
    ('eylec-sistemi', 'eylec-diskleri', 'Əyləc diskləri', 10),
    ('eylec-sistemi', 'eylec-kolodkalari', 'Əyləc kolodkaları', 20),
    ('eylec-sistemi', 'supportlar', 'Supportlar', 30),
    ('eylec-sistemi', 'abs-hisseleri', 'ABS hissələri', 40),
    ('kuzov', 'bamperler', 'Bamperlər', 10),
    ('kuzov', 'qapilar', 'Qapılar', 20),
    ('kuzov', 'kapot-ve-baqaj', 'Kapot və baqaj qapağı', 30),
    ('kuzov', 'guzguler', 'Güzgülər', 40),
    ('kuzov', 'suseler', 'Şüşələr', 50),
    ('kuzov', 'qanadlar', 'Qanadlar', 60),
    ('optika', 'faralar', 'Faralar', 10),
    ('optika', 'arxa-stoplar', 'Arxa stoplar', 20),
    ('optika', 'duman-faralari', 'Duman faraları', 30),
    ('optika', 'lampalar', 'Lampalar', 40),
    ('elektrik', 'akkumulyatorlar', 'Akkumulyatorlar', 10),
    ('elektrik', 'generator-ve-starter', 'Generator və starter', 20),
    ('elektrik', 'sensorlar', 'Sensorlar', 30),
    ('elektrik', 'idareetme-bloklari', 'İdarəetmə blokları', 40),
    ('soyutma', 'radiatorlar', 'Radiatorlar', 10),
    ('soyutma', 'kondisioner-hisseleri', 'Kondisioner hissələri', 20),
    ('soyutma', 'su-pompalari', 'Su pompaları', 30),
    ('yanacaq-ve-islenmis-qaz', 'forsunkalar', 'Forsunkalar', 10),
    ('yanacaq-ve-islenmis-qaz', 'yanacaq-nasoslari', 'Yanacaq nasosları', 20),
    ('yanacaq-ve-islenmis-qaz', 'katalizator-ve-sesbogucu', 'Katalizator və səsboğucu', 30),
    ('filtrler-ve-yaglar', 'filtrler', 'Filtrlər', 10),
    ('filtrler-ve-yaglar', 'muherrik-yaglari', 'Mühərrik yağları', 20),
    ('filtrler-ve-yaglar', 'texniki-mayeler', 'Texniki mayelər', 30),
    ('sinler-ve-diskler', 'sinler', 'Şinlər', 10),
    ('sinler-ve-diskler', 'diskler', 'Disklər', 20),
    ('salon', 'oturacaqlar', 'Oturacaqlar', 10),
    ('salon', 'on-panel', 'Ön panel və konsol', 20),
    ('salon', 'salon-detallari', 'Salon detalları', 30),
    ('aksesuarlar', 'multimedia', 'Multimedia və naviqasiya', 10),
    ('aksesuarlar', 'diger-aksesuarlar', 'Digər aksesuarlar', 20)
)
insert into public.categories (parent_id, slug, name, sort_order)
select p.id, c.slug, c.name, c.sort_order
from children c
join public.categories p on p.slug = c.parent_slug
on conflict (slug) do nothing;

-- Vehicle makes and models -----------------------------------------------------
insert into public.vehicle_makes (slug, name, is_popular, sort_order) values
  ('toyota', 'Toyota', true, 10), ('mercedes-benz', 'Mercedes-Benz', true, 20), ('bmw', 'BMW', true, 30),
  ('hyundai', 'Hyundai', true, 40), ('kia', 'Kia', true, 50), ('lada', 'LADA (VAZ)', true, 60),
  ('chevrolet', 'Chevrolet', true, 70), ('nissan', 'Nissan', true, 80), ('lexus', 'Lexus', true, 90),
  ('land-rover', 'Land Rover', true, 100), ('volkswagen', 'Volkswagen', true, 110), ('ford', 'Ford', true, 120),
  ('audi', 'Audi', false, 130), ('honda', 'Honda', false, 140), ('mitsubishi', 'Mitsubishi', false, 150),
  ('opel', 'Opel', false, 160), ('mazda', 'Mazda', false, 170), ('renault', 'Renault', false, 180),
  ('changan', 'Changan', false, 190), ('chery', 'Chery', false, 200), ('byd', 'BYD', false, 210),
  ('khazar', 'Khazar', false, 220)
on conflict (slug) do nothing;

with models (make_slug, slug, name) as (
  values
    ('toyota', 'camry', 'Camry'), ('toyota', 'corolla', 'Corolla'), ('toyota', 'prius', 'Prius'),
    ('toyota', 'rav4', 'RAV4'), ('toyota', 'land-cruiser', 'Land Cruiser'), ('toyota', 'land-cruiser-prado', 'Land Cruiser Prado'),
    ('toyota', 'highlander', 'Highlander'),
    ('mercedes-benz', 'c-class', 'C-Class'), ('mercedes-benz', 'e-class', 'E-Class'), ('mercedes-benz', 's-class', 'S-Class'),
    ('mercedes-benz', 'gle', 'GLE'), ('mercedes-benz', 'ml', 'M-Class (ML)'), ('mercedes-benz', 'sprinter', 'Sprinter'),
    ('mercedes-benz', 'vito', 'Vito'),
    ('bmw', '3-series', '3 Series'), ('bmw', '5-series', '5 Series'), ('bmw', '7-series', '7 Series'),
    ('bmw', 'x3', 'X3'), ('bmw', 'x5', 'X5'), ('bmw', 'x6', 'X6'),
    ('hyundai', 'accent', 'Accent'), ('hyundai', 'elantra', 'Elantra'), ('hyundai', 'sonata', 'Sonata'),
    ('hyundai', 'tucson', 'Tucson'), ('hyundai', 'santa-fe', 'Santa Fe'),
    ('kia', 'rio', 'Rio'), ('kia', 'cerato', 'Cerato'), ('kia', 'optima', 'Optima'), ('kia', 'k5', 'K5'),
    ('kia', 'sportage', 'Sportage'), ('kia', 'sorento', 'Sorento'),
    ('lada', '2107', '2107'), ('lada', 'niva', 'Niva (4x4)'), ('lada', 'priora', 'Priora'),
    ('lada', 'granta', 'Granta'), ('lada', 'vesta', 'Vesta'),
    ('chevrolet', 'aveo', 'Aveo'), ('chevrolet', 'cobalt', 'Cobalt'), ('chevrolet', 'cruze', 'Cruze'),
    ('chevrolet', 'lacetti', 'Lacetti'), ('chevrolet', 'malibu', 'Malibu'), ('chevrolet', 'captiva', 'Captiva'),
    ('nissan', 'altima', 'Altima'), ('nissan', 'sentra', 'Sentra'), ('nissan', 'qashqai', 'Qashqai'),
    ('nissan', 'x-trail', 'X-Trail'), ('nissan', 'patrol', 'Patrol'),
    ('lexus', 'es', 'ES'), ('lexus', 'rx', 'RX'), ('lexus', 'gx', 'GX'), ('lexus', 'lx', 'LX'),
    ('land-rover', 'range-rover', 'Range Rover'), ('land-rover', 'range-rover-sport', 'Range Rover Sport'),
    ('land-rover', 'discovery', 'Discovery'),
    ('volkswagen', 'golf', 'Golf'), ('volkswagen', 'jetta', 'Jetta'), ('volkswagen', 'passat', 'Passat'),
    ('volkswagen', 'tiguan', 'Tiguan'), ('volkswagen', 'touareg', 'Touareg'),
    ('ford', 'focus', 'Focus'), ('ford', 'fusion', 'Fusion'), ('ford', 'explorer', 'Explorer'), ('ford', 'transit', 'Transit'),
    ('audi', 'a4', 'A4'), ('audi', 'a6', 'A6'), ('audi', 'q5', 'Q5'), ('audi', 'q7', 'Q7'),
    ('honda', 'civic', 'Civic'), ('honda', 'accord', 'Accord'), ('honda', 'cr-v', 'CR-V'),
    ('mitsubishi', 'lancer', 'Lancer'), ('mitsubishi', 'outlander', 'Outlander'), ('mitsubishi', 'pajero', 'Pajero'),
    ('opel', 'astra', 'Astra'), ('opel', 'vectra', 'Vectra'), ('opel', 'insignia', 'Insignia'),
    ('mazda', 'mazda3', 'Mazda3'), ('mazda', 'mazda6', 'Mazda6'), ('mazda', 'cx-5', 'CX-5'),
    ('renault', 'logan', 'Logan'), ('renault', 'duster', 'Duster'),
    ('changan', 'cs35', 'CS35'), ('changan', 'cs55', 'CS55'), ('changan', 'cs75', 'CS75'),
    ('chery', 'tiggo-7', 'Tiggo 7'), ('chery', 'tiggo-8', 'Tiggo 8'),
    ('byd', 'song-plus', 'Song Plus'), ('byd', 'han', 'Han'), ('byd', 'seal', 'Seal'),
    ('khazar', 'lx', 'LX'), ('khazar', 'sd', 'SD')
)
insert into public.vehicle_models (make_id, slug, name)
select m.id, x.slug, x.name
from models x
join public.vehicle_makes m on m.slug = x.make_slug
on conflict (make_id, slug) do nothing;
