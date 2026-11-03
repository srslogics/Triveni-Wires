(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ForecourtDocuments = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const money = (p) =>
    "INR " +
    (p / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  function message(r) {
    return `Hello ${r.recipient},\n\nPlease find draft invoice ${r.reference} dated ${r.date} from ${r.seller}.\n${r.description}: ${r.quantity} ${r.unit}\nTotal: ${money(r.amount)}\n\nThis is a demonstration draft, not a tax invoice or payment confirmation.\nThe PDF must be attached separately to this message.`;
  }
  function whatsapp(r) {
    return (
      "https://wa.me/" +
      (r.phone || "") +
      "?text=" +
      encodeURIComponent(message(r))
    );
  }
  function pdf(r) {
    const lines = [
      "FORECOURT / DRAFT INVOICE",
      "DEMONSTRATION DOCUMENT - NOT A TAX INVOICE",
      "",
      "Invoice: " + r.reference,
      "Date: " + r.date,
      ...(r.sourceSale ? ["Source sale: " + r.sourceSale] : []),
      "Seller: " + r.seller,
      "",
      "Bill to: " + r.recipient,
      "Recipient type: " + r.recipientType,
      "Address: " + r.address,
      ...(r.phone ? ["Contact: +" + r.phone] : []),
      "",
      "ITEM DETAILS",
      r.description,
      "Quantity: " + r.quantity + " " + r.unit,
      "Unit price: " + money(r.rate),
      "TOTAL: " + money(r.amount),
      "",
      ...(r.note ? ["Note: " + r.note, ""] : []),
      "No tax calculation or statutory invoice validation is included.",
      "This document creates no additional stock, cash or receivable posting.",
      "Sample data for presentation only.",
    ];
    const wrapped = lines.flatMap((line) => {
      const out = [];
      let current = "";
      for (const word of line
        .split(" ")
        .flatMap((w) => w.match(/.{1,70}/g) || [""])) {
        if ((current + " " + word).length > 78 && current) {
          out.push(current);
          current = word;
        } else current += (current ? " " : "") + word;
      }
      out.push(current);
      return out;
    });
    if (wrapped.some((s) => /[^\x20-\x7e]/.test(s)))
      throw Error(
        "PDF download currently supports English/ASCII text. Use Print / Save as PDF for names in other scripts.",
      );
    const pages = [];
    for (let i = 0; i < wrapped.length; i += 43)
      pages.push(wrapped.slice(i, i + 43));
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    const kids = [];
    for (const lines of pages) {
      const pageId = objects.length + 1,
        streamId = pageId + 1;
      kids.push(pageId + " 0 R");
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
      );
      const stream =
        "BT /F1 11 Tf 48 790 Td 17 TL " +
        lines
          .map(
            (line, i) =>
              (i ? "T* " : "") + "(" + line.replace(/[\\()]/g, "\\$&") + ") Tj",
          )
          .join("\n") +
        " ET";
      objects.push(
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      );
    }
    objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;
    let output = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, i) => {
      offsets.push(output.length);
      output += i + 1 + " 0 obj\n" + body + "\nendobj\n";
    });
    const xref = output.length;
    output +=
      "xref\n0 " +
      (objects.length + 1) +
      "\n0000000000 65535 f \n" +
      offsets
        .slice(1)
        .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
        .join("") +
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new TextEncoder().encode(output);
  }
  return { message, whatsapp, pdf, money };
});
