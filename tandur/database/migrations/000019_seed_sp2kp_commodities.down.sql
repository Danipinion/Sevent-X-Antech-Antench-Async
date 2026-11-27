-- Migration 000019: Rollback seed komoditas acuan SP2KP
DELETE FROM commodities WHERE name IN (
    'Beras Medium',
    'Beras Premium',
    'Beras SPHP Bulog',
    'Gula Pasir Curah',
    'Minyak Goreng Sawit Kemasan Premium',
    'Minyak Goreng Sawit Curah',
    'Minyakita',
    'Daging Sapi Paha Belakang',
    'Daging Ayam Ras',
    'Telur Ayam Ras',
    'Tepung Terigu',
    'Kedelai Impor',
    'Cabai Merah Keriting',
    'Cabai Rawit Merah',
    'Cabai Merah Besar',
    'Bawang Merah',
    'Bawang Putih Honan'
);
