/* eslint-disable jsx-a11y/alt-text -- <Image> milik @react-pdf/renderer tidak punya atribut alt */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type LetterPdfData = {
  school: { name: string; gov1: string; gov2: string; address: string; contact: string; logo: string | null; city: string };
  typeLabel: string;
  formal: boolean; // perjanjian/pernyataan: judul di tengah, tanda tangan 4 pihak
  letterNumber: string;
  letterDate: string;
  subject: string;
  parentName: string;
  studentName: string;
  body: string;
  bk: { name: string; nip: string | null };
  principal: { name: string; nip: string };
  qr: string;
  verifyUrl: string;
  cancelled: boolean;
};

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 56, fontFamily: "Times-Roman", fontSize: 11.5, lineHeight: 1.45 },
  kop: { flexDirection: "row", alignItems: "center", paddingBottom: 6 },
  logo: { width: 64, height: 64, objectFit: "contain" },
  kopText: { flex: 1, alignItems: "center", textAlign: "center" },
  gov: { fontSize: 12 },
  school: { fontSize: 16, fontFamily: "Times-Bold", marginTop: 1 },
  addr: { fontSize: 9.5, marginTop: 1 },
  rule1: { borderBottomWidth: 2.2, borderBottomColor: "#000" },
  rule2: { borderBottomWidth: 0.7, borderBottomColor: "#000", marginTop: 1.5, marginBottom: 14 },
  row: { flexDirection: "row" },
  label: { width: 70 },
  colon: { width: 10 },
  title: { fontFamily: "Times-Bold", fontSize: 13, textAlign: "center", textDecoration: "underline" },
  para: { marginBottom: 8, textAlign: "justify" },
  kvRow: { flexDirection: "row", marginLeft: 36 },
  kvLabel: { width: 110 },
  signs: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  sign: { width: "45%", alignItems: "center", textAlign: "center" },
  signName: { fontFamily: "Times-Bold", textDecoration: "underline", marginTop: 52 },
  footer: { position: "absolute", left: 56, right: 56, bottom: 22, flexDirection: "row", alignItems: "center", gap: 8 },
  qr: { width: 58, height: 58 },
  small: { fontSize: 8, color: "#444" },
  watermark: { position: "absolute", top: 330, left: 60, fontSize: 64, color: "#d00", opacity: 0.18, transform: "rotate(-30deg)", fontFamily: "Times-Bold" },
});

/** Baris "label : nilai" di badan surat dirender sebagai tabel agar titik dua sejajar. */
function BodyBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <>
      {paragraphs.map((p, i) => {
        const lines = p.split("\n");
        const isKv = lines.every((l) => /^\s*[^:]{1,40}?\s+:\s/.test(l) || /^\d+\.\s/.test(l.trim()));
        if (isKv && lines.some((l) => l.includes(" : "))) {
          return (
            <View key={i} style={{ marginBottom: 8 }}>
              {lines.map((l, j) => {
                const m = l.match(/^\s*(.+?)\s+:\s(.*)$/);
                return m ? (
                  <View key={j} style={s.kvRow}>
                    <Text style={s.kvLabel}>{m[1]}</Text>
                    <Text style={s.colon}>:</Text>
                    <Text style={{ flex: 1 }}>{m[2]}</Text>
                  </View>
                ) : (
                  <Text key={j}>{l}</Text>
                );
              })}
            </View>
          );
        }
        return (
          <Text key={i} style={s.para}>
            {p}
          </Text>
        );
      })}
    </>
  );
}

function Sign({ role, name, nip }: { role: string; name: string; nip?: string | null }) {
  return (
    <View style={s.sign}>
      <Text>{role}</Text>
      <Text style={s.signName}>{name || "(............................)"}</Text>
      {nip ? <Text>NIP. {nip}</Text> : null}
    </View>
  );
}

export function LetterPdf({ d }: { d: LetterPdfData }) {
  return (
    <Document title={`${d.typeLabel} ${d.letterNumber}`} author={d.school.name} subject={d.subject}>
      <Page size="A4" style={s.page}>
        {/* Kop surat */}
        <View style={s.kop}>
          {d.school.logo ? <Image src={d.school.logo} style={s.logo} /> : <View style={{ width: 64 }} />}
          <View style={s.kopText}>
            {d.school.gov1 ? <Text style={s.gov}>{d.school.gov1.toUpperCase()}</Text> : null}
            {d.school.gov2 ? <Text style={s.gov}>{d.school.gov2.toUpperCase()}</Text> : null}
            <Text style={s.school}>{d.school.name.toUpperCase()}</Text>
            <Text style={s.addr}>{d.school.address}</Text>
            {d.school.contact ? <Text style={s.addr}>{d.school.contact}</Text> : null}
          </View>
          <View style={{ width: 64 }} />
        </View>
        <View style={s.rule1} />
        <View style={s.rule2} />

        {d.formal ? (
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <Text style={s.title}>{d.typeLabel.toUpperCase()}</Text>
            <Text>Nomor: {d.letterNumber}</Text>
          </View>
        ) : (
          <View style={{ marginBottom: 14 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View>
                <View style={s.row}>
                  <Text style={s.label}>Nomor</Text>
                  <Text style={s.colon}>:</Text>
                  <Text>{d.letterNumber}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.label}>Lampiran</Text>
                  <Text style={s.colon}>:</Text>
                  <Text>-</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.label}>Perihal</Text>
                  <Text style={s.colon}>:</Text>
                  <Text style={{ fontFamily: "Times-Bold", maxWidth: 230 }}>{d.typeLabel}</Text>
                </View>
              </View>
              <Text>
                {d.school.city}, {d.letterDate}
              </Text>
            </View>
          </View>
        )}

        <BodyBlock text={d.body} />

        {d.formal ? (
          <>
            <Text style={{ textAlign: "right", marginTop: 8 }}>
              {d.school.city}, {d.letterDate}
            </Text>
            <View style={s.signs}>
              <Sign role="Orang Tua/Wali," name={d.parentName} />
              <Sign role="Peserta Didik," name={d.studentName} />
            </View>
            <View style={s.signs} wrap={false}>
              <Sign role="Guru Bimbingan dan Konseling," name={d.bk.name} nip={d.bk.nip} />
              <Sign role="Mengetahui, Kepala Sekolah," name={d.principal.name} nip={d.principal.nip} />
            </View>
          </>
        ) : (
          <View style={s.signs} wrap={false}>
            <Sign role="Guru Bimbingan dan Konseling," name={d.bk.name} nip={d.bk.nip} />
            <Sign role="Kepala Sekolah," name={d.principal.name} nip={d.principal.nip} />
          </View>
        )}

        <View style={s.footer} fixed>
          <Image src={d.qr} style={s.qr} />
          <View>
            <Text style={s.small}>Pindai kode QR untuk memverifikasi keaslian surat ini.</Text>
            <Text style={s.small}>{d.verifyUrl}</Text>
          </View>
        </View>
        {d.cancelled ? <Text style={s.watermark}>DIBATALKAN</Text> : null}
      </Page>
    </Document>
  );
}
