export interface KtpOcrResult {
  nik: string;
  name: string;
  birthInfo: string;
  birthPlace: string;
  birthDate: string;
  address: string;
  gender?: string;
  occupation?: string;
  rawText: string;
}

/**
 * Normalisasi dan ekstraksi data kependudukan dari hasil OCR dokumen e-KTP Indonesia.
 */
export function parseKtpText(rawText: string): KtpOcrResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let nik = '';
  let name = '';
  let birthInfo = '';
  let birthPlace = '';
  let birthDate = '';
  let alamat = '';
  let rtrw = '';
  let kelDesa = '';
  let kecamatan = '';
  let kota = '';
  let gender = '';
  let occupation = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Deteksi Provinsi / Kota / Kabupaten dari header e-KTP
    if (/(?:KOTA|KABUPATEN|KAB\.)\s+([A-Z\s]+)/i.test(line)) {
      const m = line.match(/(?:KOTA|KABUPATEN|KAB\.)\s+([A-Z\s]+)/i);
      if (m && !kota) {
        kota = m[0].trim().toUpperCase();
      }
    }

    // 1. Ekstraksi NIK (16 digit)
    if (/(?:NIK|N1K|N[Iil!|]K)/i.test(line) && !nik) {
      let rawDigits = line
        .replace(/^.*?(?:NIK|N1K|N[Iil!|]K)\s*[:\s]*/i, '')
        .replace(/[^0-9A-Za-z]/g, '');

      // Konversi karakter mirip angka
      rawDigits = rawDigits
        .replace(/[Il|!]/g, '1')
        .replace(/[OoD]/g, '0')
        .replace(/[Bb]/g, '8')
        .replace(/[Ss]/g, '5')
        .replace(/[Zz]/g, '2');

      const match16 = rawDigits.match(/\d{16}/);
      if (match16) {
        nik = match16[0];
      } else if (rawDigits.length >= 16) {
        nik = rawDigits.slice(-16);
      }
    }

    // 2. Ekstraksi Nama Lengkap
    if (/(?:Nama|Narna|Nam4|Name)\s*[:\s]+/i.test(line) && !name) {
      let clean = line
        .replace(/^.*?(?:Nama|Narna|Nam4|Name)\s*[:\s]*/i, '')
        .replace(/[^a-zA-Z\s.,']/g, '')
        .trim();

      // Jika baris nama terlalu pendek atau terpotong ke baris berikutnya
      if (clean.length < 3 && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (
          !/(?:Tempat|Tgl|Lahir|Jenis|Kelamin|Alamat|Agama|Pekerjaan)/i.test(nextLine) &&
          nextLine.length > 2
        ) {
          clean = nextLine.replace(/[^a-zA-Z\s.,']/g, '').trim();
        }
      }

      if (clean.length >= 2) {
        name = clean.toUpperCase();
      }
    }

    // 3. Ekstraksi Tempat & Tanggal Lahir (TTL)
    if (/(?:Tempat|Tgl\s*Lahir|TTL|Lahir)/i.test(line) && !birthInfo) {
      let clean = line
        .replace(/^.*?(?:Tempat\s*[\/|l]?\s*Tgl\s*Lahir|TTL|Lahir)\s*[:\s]*/i, '')
        .replace(/^[|:\s]+/, '')
        .trim();

      if (clean.length >= 3) {
        birthInfo = clean;
        const ttlParts = clean.split(/[,/]/);
        if (ttlParts.length >= 2) {
          birthPlace = ttlParts[0].trim();
          birthDate = ttlParts.slice(1).join(',').trim();
        } else {
          birthPlace = clean;
        }
      }
    }

    // 4. Ekstraksi Jenis Kelamin
    if (/(?:Jenis\s*Kelamin|Kelamin)/i.test(line) && !gender) {
      if (/LAKI|PRIA/i.test(line)) {
        gender = 'LAKI-LAKI';
      } else if (/PEREMPUAN|WANITA/i.test(line)) {
        gender = 'PEREMPUAN';
      }
    }

    // 5. Ekstraksi Alamat
    if (/Alamat\s*[:\s]+/i.test(line) && !alamat) {
      let clean = line.replace(/^.*?Alamat\s*[:\s]*/i, '').trim();
      if (clean && !/RT|RW|Kel|Desa|Kecamatan/i.test(clean)) {
        alamat = clean;
      }
    }

    // RT/RW
    if (/RT\s*[\/|l]?\s*RW/i.test(line) && !rtrw) {
      let clean = line
        .replace(/^.*?RT\s*[\/|l]?\s*RW\s*[:\s]*/i, '')
        .replace(/[^0-9A-Za-z\/\-\s]/g, '')
        .trim();
      if (clean) rtrw = clean;
    }

    // Kelurahan / Desa
    if (/(?:Kel(?:\/|l)?Desa|Kelurahan|Desa)\s*[:\s]*/i.test(line) && !kelDesa) {
      let clean = line
        .replace(/^.*?(?:Kel(?:\/|l)?Desa|Kelurahan|Desa)\s*[:\s]*/i, '')
        .replace(/[^a-zA-Z0-9\s.,\-\/]/g, '')
        .trim();
      if (clean) kelDesa = clean;
    }

    // Kecamatan
    if (/Kecamatan\s*[:\s]*/i.test(line) && !kecamatan) {
      let clean = line
        .replace(/^.*?Kecamatan\s*[:\s]*/i, '')
        .replace(/[^a-zA-Z0-9\s.,\-\/]/g, '')
        .trim();
      if (clean) kecamatan = clean;
    }

    // Pekerjaan
    if (/Pekerjaan\s*[:\s]*/i.test(line) && !occupation) {
      let clean = line
        .replace(/^.*?Pekerjaan\s*[:\s]*/i, '')
        .replace(/[^a-zA-Z\s.,\-\/]/g, '')
        .trim();
      if (clean) occupation = clean;
    }
  }

  // Backup pencarian 16 digit NIK di seluruh teks
  if (!nik) {
    const allTextClean = rawText.replace(/[^0-9]/g, ' ');
    const potentialNiks = allTextClean.match(/\b\d{16}\b/g);
    if (potentialNiks && potentialNiks.length > 0) {
      nik = potentialNiks[0];
    }
  }

  // Gabungkan seluruh bagian alamat menjadi satu kesatuan alamat lengkap KTP
  const addressSegments: string[] = [];
  if (alamat) addressSegments.push(alamat);
  if (rtrw) addressSegments.push(`RT/RW ${rtrw}`);
  if (kelDesa) addressSegments.push(`Kel/Desa ${kelDesa}`);
  if (kecamatan) addressSegments.push(`Kec. ${kecamatan}`);
  if (kota) addressSegments.push(kota);

  const fullAddress =
    addressSegments.length > 0
      ? addressSegments.join(', ')
      : alamat || '';

  return {
    nik: nik.trim(),
    name: name.trim(),
    birthInfo: birthInfo.trim(),
    birthPlace: birthPlace.trim(),
    birthDate: birthDate.trim(),
    address: fullAddress.trim(),
    gender: gender.trim(),
    occupation: occupation.trim(),
    rawText,
  };
}
