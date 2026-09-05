const MatchResult = require('../models/MatchResult');

async function runSelfAudit() {
  const matches = await MatchResult.find({
    confidence: { $in: ['Exact Match', 'Fuzzy Match'] },
  }).populate('bankStatementId').populate('ledgerId').populate('settlementId').lean();

  const flags = [];
  const confirmedIds = new Set();

  for (const match of matches) {
    const matchFlags = [];

    // Check 1: Same amount but different vendor/reference
    if (match.bankStatementId && match.ledgerId) {
      const bankDesc = (match.bankStatementId.description || '').toLowerCase();
      const vendorName = (match.ledgerId.vendorName || '').toLowerCase();
      if (vendorName && !bankDesc.includes(vendorName.split(' ')[0]) && match.matchDetails?.referenceSimilarity < 0.4) {
        matchFlags.push({
          flag: 'name_mismatch',
          reason: `Bank description "${match.bankStatementId.description}" doesn't clearly reference vendor "${match.ledgerId.vendorName}"`,
        });
      }
    }

    // Check 2: Amount matches but date is >5 days apart
    if (match.matchDetails?.dateDiffDays > 5) {
      matchFlags.push({
        flag: 'large_date_gap',
        reason: `Date difference of ${match.matchDetails.dateDiffDays} days exceeds 5-day threshold`,
      });
    }

    // Check 3: Duplicate match (same bank row matched in multiple results)
    if (match.bankStatementId) {
      const bankId = match.bankStatementId._id.toString();
      if (confirmedIds.has(bankId)) {
        matchFlags.push({
          flag: 'duplicate_match',
          reason: `Bank statement ${match.bankStatementId.referenceNo} is matched to multiple ledger entries`,
        });
      }
      confirmedIds.add(bankId);
    }

    if (matchFlags.length > 0) {
      await MatchResult.findByIdAndUpdate(match._id, { auditFlags: matchFlags });
      flags.push({
        matchId: match._id,
        confidence: match.confidence,
        bankRef: match.bankStatementId?.referenceNo,
        ledgerInv: match.ledgerId?.invoiceNo,
        amount: match.bankStatementId?.amount || match.ledgerId?.amount,
        flags: matchFlags,
      });
    }
  }

  const totalChecked = matches.length;
  const totalFlagged = flags.length;
  const totalConfirmed = totalChecked - totalFlagged;

  return {
    summary: {
      totalChecked,
      totalConfirmed,
      totalFlagged,
      message: `${totalConfirmed} matches confirmed, ${totalFlagged} flagged for second look`,
    },
    flaggedItems: flags,
  };
}

module.exports = { runSelfAudit };
