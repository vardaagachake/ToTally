const PDFDocument = require('pdfkit');
const { chat, MULTILINGUAL_SYSTEM_PROMPT } = require('../integrations/llm');
const { getMatchStats } = require('./matchEngine');
const { getExceptionSummary } = require('./exceptionEngine');
const { getVendorAnomalies } = require('./vendorEngine');
const { getTaxSummary } = require('./taxEngine');
const { generateForecast } = require('./forecastEngine');

async function generateReport(language = 'en') {
  // Gather all data
  const [matchStats, exceptionSummary, vendorAnomalies, taxSummary, forecast] = await Promise.all([
    getMatchStats(),
    getExceptionSummary(),
    getVendorAnomalies(),
    getTaxSummary(),
    generateForecast(30),
  ]);

  // Top anomalies
  const topAnomalies = vendorAnomalies.slice(0, 3);

  // Build report data
  const reportData = {
    generatedAt: new Date().toISOString(),
    matchRate: matchStats.matchRate,
    totalTransactions: matchStats.total,
    matched: matchStats.matched,
    byConfidence: matchStats.byConfidence,
    exceptions: {
      total: exceptionSummary.totalExceptions,
      totalAmount: exceptionSummary.totalAmount,
      byCategory: exceptionSummary.byCategory,
    },
    vendorAnomalies: topAnomalies.map(a => ({
      vendor: a.vendor,
      message: a.message,
      severity: a.severity,
    })),
    taxSummary: {
      totalLiability: taxSummary.totalTaxLiability,
      needsReview: taxSummary.needsReview,
      bySlab: taxSummary.bySlab,
    },
    forecast: {
      currentCash: forecast.currentCash,
      day30Cash: forecast.baseline[30]?.cash || 0,
      unresolvedRisk: forecast.unresolvedExceptionAmount,
    },
  };

  // Generate narrative via LLM
  const narrativePrompt = `Generate a professional closing finance memo based on this reconciliation data. Include:
1. Executive summary with match rate
2. Exception breakdown by category with total amounts
3. Top vendor anomalies
4. Tax summary by GST slab
5. 30-day cash forecast outlook

Data: ${JSON.stringify(reportData, null, 2)}

Format it as a clean, professional memo. Use ₹ for Indian Rupee amounts.`;

  const systemPrompt = language !== 'en' 
    ? `${MULTILINGUAL_SYSTEM_PROMPT}\nGenerate this report in the same language the user specified.`
    : 'You are a finance report generator. Write clear, professional financial memos.';

  const narrative = await chat(systemPrompt, narrativePrompt);

  return {
    ...reportData,
    narrative,
  };
}

function generatePDF(reportData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#0C2451');
    doc.fillColor('white').fontSize(24).text('ToTally — Closing Report', 50, 30);
    
    doc.fillColor('#333').moveDown(2);
    doc.fontSize(10).text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, 50);
    doc.moveDown();

    // Match Rate
    doc.fontSize(16).fillColor('#0C2451').text('Reconciliation Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Match Rate: ${reportData.matchRate}% (${reportData.matched}/${reportData.totalTransactions} transactions)`);
    doc.moveDown(0.3);
    
    Object.entries(reportData.byConfidence).forEach(([label, count]) => {
      doc.text(`  • ${label}: ${count}`);
    });
    doc.moveDown();

    // Exceptions
    doc.fontSize(16).fillColor('#0C2451').text('Exception Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Total Exceptions: ${reportData.exceptions.total} (₹${reportData.exceptions.totalAmount.toLocaleString('en-IN')})`);
    doc.moveDown(0.3);

    Object.entries(reportData.exceptions.byCategory).forEach(([cat, data]) => {
      doc.text(`  • ${cat}: ${data.count} items (₹${data.totalAmount.toLocaleString('en-IN')})`);
    });
    doc.moveDown();

    // Tax Summary
    doc.fontSize(16).fillColor('#0C2451').text('Tax Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Total Tax Liability: ₹${reportData.taxSummary.totalLiability.toLocaleString('en-IN')}`);
    doc.text(`Needs Review: ${reportData.taxSummary.needsReview} transactions`);
    doc.moveDown(0.3);

    reportData.taxSummary.bySlab.forEach(slab => {
      doc.text(`  • GST ${slab.rate}%: ${slab.count} items, Base: ₹${slab.baseAmount.toLocaleString('en-IN')}, Tax: ₹${slab.taxAmount.toLocaleString('en-IN')}`);
    });
    doc.moveDown();

    // Forecast
    doc.fontSize(16).fillColor('#0C2451').text('30-Day Forecast');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Current Cash: ₹${reportData.forecast.currentCash.toLocaleString('en-IN')}`);
    doc.text(`Projected (30 days): ₹${reportData.forecast.day30Cash.toLocaleString('en-IN')}`);
    doc.text(`Unresolved Risk: ₹${reportData.forecast.unresolvedRisk.toLocaleString('en-IN')}`);
    doc.moveDown();

    // Narrative
    if (reportData.narrative) {
      doc.addPage();
      doc.fontSize(16).fillColor('#0C2451').text('Detailed Analysis');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333').text(reportData.narrative, { align: 'left', lineGap: 2 });
    }

    doc.end();
  });
}

module.exports = { generateReport, generatePDF };
