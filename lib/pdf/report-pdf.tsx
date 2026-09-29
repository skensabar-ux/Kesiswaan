import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportData } from "@/lib/report";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  muted: { color: "#555" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  totals: { flexDirection: "row", gap: 8, marginTop: 10 },
  tile: { flex: 1, borderWidth: 0.7, borderColor: "#ccc", borderRadius: 4, padding: 6 },
  big: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 3 },
  th: { flexDirection: "row", backgroundColor: "#2f5bb7", color: "#fff", paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 16, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", color: "#777", fontSize: 8 },
});

type Col = { h: string; w: number; right?: boolean };
function T({ cols, rows }: { cols: Col[]; rows: (string | number)[][] }) {
  return (
    <View>
      <View style={s.th} fixed>
        {cols.map((c, i) => (
          <Text key={i} style={{ width: `${c.w}%`, paddingHorizontal: 4, textAlign: c.right ? "right" : "left" }}>
            {c.h}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? <Text style={{ padding: 4, color: "#777" }}>Tidak ada data.</Text> : null}
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          {r.map((v, j) => (
            <Text key={j} style={{ width: `${cols[j]!.w}%`, paddingHorizontal: 4, textAlign: cols[j]!.right ? "right" : "left" }}>
              {String(v)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ReportPdf({ r, school, label, printedAt }: { r: ReportData; school: string; label: string; printedAt: string }) {
  return (
    <Document title={`Laporan Kesiswaan ${label}`} author={school}>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Laporan Kesiswaan — {school}</Text>
        <Text style={s.muted}>{label}</Text>
        <View style={s.totals}>
          {[
            ["Kejadian", r.totals.incidents],
            ["Pelanggaran", r.totals.violations],
            ["Total poin", r.totals.points],
            ["Siswa terlibat", r.totals.students],
            ["Prestasi", r.totals.achievements],
          ].map(([l, v]) => (
            <View key={l} style={s.tile}>
              <Text style={s.big}>{String(v)}</Text>
              <Text style={s.muted}>{l}</Text>
            </View>
          ))}
        </View>
        <Text style={s.h2}>Per jenis pelanggaran</Text>
        <T
          cols={[{ h: "Jenis", w: 60 }, { h: "Kategori", w: 16 }, { h: "Jumlah", w: 12, right: true }, { h: "Poin", w: 12, right: true }]}
          rows={r.types.map((t) => [t.name, t.level, t.count, t.points])}
        />
        <Text style={s.h2}>Per kelas</Text>
        <T
          cols={[{ h: "Kelas", w: 40 }, { h: "Siswa", w: 20, right: true }, { h: "Pelanggaran", w: 20, right: true }, { h: "Poin", w: 20, right: true }]}
          rows={r.classes.map((c) => [c.name, c.students, c.count, c.points])}
        />
        <Text style={s.h2}>Per jurusan</Text>
        <T cols={[{ h: "Jurusan", w: 60 }, { h: "Pelanggaran", w: 20, right: true }, { h: "Poin", w: 20, right: true }]} rows={r.majors.map((m) => [m.name, m.count, m.points])} />
        <Text style={s.h2} break={r.students.length > 25}>
          Per siswa
        </Text>
        <T
          cols={[
            { h: "No", w: 6, right: true },
            { h: "Nama", w: 36 },
            { h: "NISN", w: 16 },
            { h: "Kelas", w: 14 },
            { h: "Pelanggaran", w: 12, right: true },
            { h: "Poin", w: 16, right: true },
          ]}
          rows={r.students.map((x, i) => [i + 1, x.name, x.nisn, x.className, x.count, x.points])}
        />
        <View style={s.footer} fixed>
          <Text>Dicetak {printedAt} · Dokumen internal — memuat data anak, jangan disebarluaskan.</Text>
          <Text render={({ pageNumber, totalPages }) => `Hal. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
