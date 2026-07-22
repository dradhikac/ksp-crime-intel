'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();
app.use(express.json());

async function fetchAll(zcql, query, tableKey) {
  let all = [];
  let offset = 0;
  while (true) {
    const page = await zcql.executeZCQLQuery(`${query} LIMIT ${offset},300`);
    all = all.concat(page);
    if (page.length < 300) break;
    offset += 300;
  }
  const seen = new Set();
  return all.filter(row => {
    const id = row[tableKey].ROWID;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// ---- /meta: lookup lists for frontend filter dropdowns ----
app.get('/meta', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const [districts, crimeHeads, statuses, categories] = await Promise.all([
      zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300"),
      zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead LIMIT 300"),
      zcql.executeZCQLQuery("SELECT ROWID, CaseStatusName FROM CaseStatusMaster LIMIT 300"),
      zcql.executeZCQLQuery("SELECT ROWID, LookupValue FROM CaseCategory LIMIT 300")
    ]);

    res.status(200).json({
      districts: districts.map(r => ({ id: r.District.ROWID, name: r.District.DistrictName })),
      crimeHeads: crimeHeads.map(r => ({ id: r.CrimeHead.ROWID, name: r.CrimeHead.CrimeGroupName })),
      statuses: statuses.map(r => ({ id: r.CaseStatusMaster.ROWID, name: r.CaseStatusMaster.CaseStatusName })),
      categories: categories.map(r => ({ id: r.CaseCategory.ROWID, name: r.CaseCategory.LookupValue }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- /cases: list with filters + pagination ----
app.get('/cases', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize) || 25);
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (req.query.districtId) {
      const units = await zcql.executeZCQLQuery(
        `SELECT ROWID FROM Unit WHERE DistrictID = ${parseInt(req.query.districtId)} LIMIT 300`
      );
      const unitIds = units.map(u => u.Unit.ROWID);
      if (unitIds.length === 0) {
        return res.status(200).json({ page, pageSize, total: 0, results: [] });
      }
      conditions.push(`PoliceStationID IN (${unitIds.join(',')})`);
    }
    if (req.query.crimeHeadId) {
      conditions.push(`CrimeMajorHeadID = ${parseInt(req.query.crimeHeadId)}`);
    }
    if (req.query.statusId) {
      conditions.push(`CaseStatusID = ${parseInt(req.query.statusId)}`);
    }
    if (req.query.dateFrom) {
      conditions.push(`CrimeRegisteredDate >= '${req.query.dateFrom}'`);
    }
    if (req.query.dateTo) {
      conditions.push(`CrimeRegisteredDate <= '${req.query.dateTo}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await fetchAll(zcql, `SELECT ROWID FROM CaseMaster ${whereClause}`, 'CaseMaster');

    const dataQuery = `SELECT ROWID, CrimeNo, CaseNo, CrimeRegisteredDate, CrimeMajorHeadID, CrimeMinorHeadID, CaseStatusID, PoliceStationID, latitude, longitude FROM CaseMaster ${whereClause} LIMIT ${offset},${pageSize}`;
    const rows = await zcql.executeZCQLQuery(dataQuery);

    res.status(200).json({
      page,
      pageSize,
      total: countRows.length,
      results: rows.map(r => ({
        id: r.CaseMaster.ROWID,
        crimeNo: r.CaseMaster.CrimeNo,
        caseNo: r.CaseMaster.CaseNo,
        registeredDate: r.CaseMaster.CrimeRegisteredDate,
        crimeHeadId: r.CaseMaster.CrimeMajorHeadID,
        crimeSubHeadId: r.CaseMaster.CrimeMinorHeadID,
        statusId: r.CaseMaster.CaseStatusID,
        policeStationId: r.CaseMaster.PoliceStationID,
        latitude: r.CaseMaster.latitude,
        longitude: r.CaseMaster.longitude
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ---- /cases/:id: full case detail ----
app.get('/cases/:id', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const caseId = parseInt(req.params.id);

    const [caseRows, victims, accused, complainants, chargesheets, actSections] = await Promise.all([
      zcql.executeZCQLQuery(`SELECT * FROM CaseMaster WHERE ROWID = ${caseId} LIMIT 1`),
      zcql.executeZCQLQuery(`SELECT * FROM Victim WHERE CaseMasterID = ${caseId} LIMIT 300`),
      zcql.executeZCQLQuery(`SELECT * FROM Accused WHERE CaseMasterID = ${caseId} LIMIT 300`),
      zcql.executeZCQLQuery(`SELECT * FROM ComplainantDetails WHERE CaseMasterID = ${caseId} LIMIT 300`),
      zcql.executeZCQLQuery(`SELECT * FROM ChargesheetDetails WHERE CaseMasterID = ${caseId} LIMIT 300`),
      zcql.executeZCQLQuery(`SELECT * FROM ActSectionAssociation WHERE CaseMasterID = ${caseId} LIMIT 300`)
    ]);

    if (caseRows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json({
      case: caseRows[0].CaseMaster,
      victims: victims.map(v => v.Victim),
      accused: accused.map(a => a.Accused),
      complainants: complainants.map(c => c.ComplainantDetails),
      chargesheets: chargesheets.map(c => c.ChargesheetDetails),
      actSections: actSections.map(a => a.ActSectionAssociation)
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ---- /stats/summary: cached aggregates + live hotspot points ----
app.get('/stats/summary', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const segment = catalystApp.cache().segment('StatsCache');
    const zcql = catalystApp.zcql();

    const cases = await fetchAll(zcql, "SELECT ROWID, CrimeMajorHeadID, CaseStatusID, PoliceStationID, CrimeRegisteredDate, latitude, longitude FROM CaseMaster", 'CaseMaster');

    let aggregates = null;
    let fromCache = true;
    try {
      const cached = await segment.getValue('summary_aggregates');
      if (cached) aggregates = JSON.parse(cached);
    } catch (cacheMiss) {
      fromCache = false;
    }

    const crimeHeadName = {};
    if (!aggregates) {
      const units = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Unit LIMIT 300");
      const districts = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300");
      const crimeHeads = await zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead LIMIT 300");
      const statuses = await zcql.executeZCQLQuery("SELECT ROWID, CaseStatusName FROM CaseStatusMaster LIMIT 300");

      const unitToDistrict = {};
      units.forEach(u => { unitToDistrict[String(u.Unit.ROWID)] = String(u.Unit.DistrictID); });
      const districtName = {};
      districts.forEach(d => { districtName[String(d.District.ROWID)] = d.District.DistrictName; });
      crimeHeads.forEach(c => { crimeHeadName[String(c.CrimeHead.ROWID)] = c.CrimeHead.CrimeGroupName; });
      const statusName = {};
      statuses.forEach(s => { statusName[String(s.CaseStatusMaster.ROWID)] = s.CaseStatusMaster.CaseStatusName; });

      function bump(map, key) { map[key] = (map[key] || 0) + 1; }
      const byDistrict = {}, byCrimeHead = {}, byStatus = {}, byMonth = {};

      cases.forEach(row => {
        const c = row.CaseMaster;
        bump(byDistrict, districtName[unitToDistrict[String(c.PoliceStationID)]] || 'Unknown');
        bump(byCrimeHead, crimeHeadName[String(c.CrimeMajorHeadID)] || 'Unknown');
        bump(byStatus, statusName[String(c.CaseStatusID)] || 'Unknown');
        bump(byMonth, c.CrimeRegisteredDate ? c.CrimeRegisteredDate.substring(0, 7) : 'Unknown');
      });

      function toSortedArray(obj) {
        return Object.entries(obj).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      }

      aggregates = {
        totalCases: cases.length,
        byDistrict: toSortedArray(byDistrict),
        byCrimeHead: toSortedArray(byCrimeHead),
        byStatus: toSortedArray(byStatus),
        byMonth: Object.entries(byMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month))
      };

      await segment.put('summary_aggregates', JSON.stringify(aggregates), 1);
      fromCache = false;
    } else {
      const crimeHeads = await zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead LIMIT 300");
      crimeHeads.forEach(c => { crimeHeadName[String(c.CrimeHead.ROWID)] = c.CrimeHead.CrimeGroupName; });
    }

    const hotspotPoints = cases
      .filter(row => row.CaseMaster.latitude && row.CaseMaster.longitude)
      .map(row => ({
        lat: row.CaseMaster.latitude,
        lng: row.CaseMaster.longitude,
        crimeHead: crimeHeadName[String(row.CaseMaster.CrimeMajorHeadID)] || 'Unknown'
      }));

    res.status(200).json({ ...aggregates, hotspotPoints, cached: fromCache });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ---- /network/graph: repeat-offender network for link analysis ----
app.get('/network/graph', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const accused = await fetchAll(zcql, "SELECT ROWID, CaseMasterID, AccusedName, AgeYear FROM Accused", 'Accused');
    const cases = await fetchAll(zcql, "SELECT ROWID, CrimeNo, CrimeMajorHeadID, PoliceStationID, CrimeRegisteredDate FROM CaseMaster", 'CaseMaster');
    const units = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Unit LIMIT 300");
    const districts = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300");
    const crimeHeads = await zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead LIMIT 300");

    const caseById = {};
    cases.forEach(c => { caseById[c.CaseMaster.ROWID] = c.CaseMaster; });
    const unitToDistrict = {};
    units.forEach(u => { unitToDistrict[String(u.Unit.ROWID)] = String(u.Unit.DistrictID); });
    const districtName = {};
    districts.forEach(d => { districtName[String(d.District.ROWID)] = d.District.DistrictName; });
    const crimeHeadName = {};
    crimeHeads.forEach(c => { crimeHeadName[String(c.CrimeHead.ROWID)] = c.CrimeHead.CrimeGroupName; });

    function normalize(name) {
      return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    const byName = {};
    accused.forEach(row => {
      const a = row.Accused;
      const key = normalize(a.AccusedName);
      if (!byName[key]) byName[key] = [];
      byName[key].push(a);
    });

    // Cluster by total age SPAN, not neighbor-to-neighbor gap — a real repeat
    // offender's age never drifts more than 2 years across their case entries.
    // Fixing the cluster's minimum age (rather than a running average or the
    // previous entry) prevents unrelated same-named people from chaining
    // together through a dense run of ages.
    const AGE_SPAN_LIMIT = 2;
    const identityGroups = [];

    Object.values(byName).forEach(entries => {
      const sorted = [...entries].sort((a, b) => (Number(a.AgeYear) || 0) - (Number(b.AgeYear) || 0));
      let currentCluster = [sorted[0]];
      let clusterMinAge = Number(sorted[0].AgeYear) || 0;

      for (let i = 1; i < sorted.length; i++) {
        const age = Number(sorted[i].AgeYear) || 0;
        if (age - clusterMinAge <= AGE_SPAN_LIMIT) {
          currentCluster.push(sorted[i]);
        } else {
          identityGroups.push(currentCluster);
          currentCluster = [sorted[i]];
          clusterMinAge = age;
        }
      }
      identityGroups.push(currentCluster);
    });

    const repeatOffenders = identityGroups
      .filter(g => new Set(g.map(e => e.CaseMasterID)).size >= 2)
      .map(g => ({ displayName: g[0].AccusedName, entries: g }));

    const nodes = [];
    const links = [];
    const addedCaseNodes = new Set();

    // compute confidence and build nodes/links for each repeat offender
    repeatOffenders.forEach((offender, idx) => {
      const caseCount = new Set(offender.entries.map(e => e.CaseMasterID)).size;
      offender.confidence = caseCount >= 4 ? 'high' : caseCount === 3 ? 'medium' : 'low';

      const offenderId = `offender-${idx}`;
      nodes.push({ id: offenderId, type: 'offender', label: offender.displayName, confidence: offender.confidence });

      offender.entries.forEach(entry => {
        const c = caseById[entry.CaseMasterID];
        if (!c) return;
        const caseNodeId = `case-${entry.CaseMasterID}`;

        if (!addedCaseNodes.has(caseNodeId)) {
          const districtId = unitToDistrict[String(c.PoliceStationID)];
          nodes.push({
            id: caseNodeId,
            type: 'case',
            label: c.CrimeNo,
            crimeHead: crimeHeadName[String(c.CrimeMajorHeadID)] || 'Unknown',
            district: districtName[districtId] || 'Unknown',
            date: c.CrimeRegisteredDate
          });
          addedCaseNodes.add(caseNodeId);
        }

        links.push({ source: offenderId, target: caseNodeId, type: 'accused_in_case' });
      });
    });

    const caseToOffenders = {};
    links.forEach(l => {
      if (!caseToOffenders[l.target]) caseToOffenders[l.target] = [];
      if (!caseToOffenders[l.target].includes(l.source)) caseToOffenders[l.target].push(l.source);
    });
    Object.values(caseToOffenders).forEach(offenderIds => {
      for (let i = 0; i < offenderIds.length; i++) {
        for (let j = i + 1; j < offenderIds.length; j++) {
          if (offenderIds[i] !== offenderIds[j]) {
            links.push({ source: offenderIds[i], target: offenderIds[j], type: 'co_accused' });
          }
        }
      }
    });

    res.status(200).json({
      nodes,
      links,
      totalRepeatOffenders: repeatOffenders.length,
      totalAccused: accused.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get('/ml/training-data', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const cases = await fetchAll(zcql, "SELECT ROWID, PoliceStationID, GravityOffenceID, CrimeRegisteredDate FROM CaseMaster", 'CaseMaster');
    const units = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Unit LIMIT 300");
    const districts = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300");
    const gravities = await zcql.executeZCQLQuery("SELECT ROWID, LookupValue FROM GravityOffence LIMIT 300");

    const unitToDistrict = {};
    units.forEach(u => { unitToDistrict[String(u.Unit.ROWID)] = String(u.Unit.DistrictID); });
    const districtName = {};
    districts.forEach(d => { districtName[String(d.District.ROWID)] = d.District.DistrictName; });
    const heinousId = gravities.find(g => g.GravityOffence.LookupValue === 'Heinous')?.GravityOffence.ROWID;

    // Bucket every case into district + year-month
    const buckets = {}; // key: districtName|YYYY-MM
    cases.forEach(row => {
      const c = row.CaseMaster;
      if (!c.CrimeRegisteredDate) return;
      const dName = districtName[unitToDistrict[String(c.PoliceStationID)]] || 'Unknown';
      const month = c.CrimeRegisteredDate.substring(0, 7);
      const key = `${dName}|${month}`;
      if (!buckets[key]) buckets[key] = { total: 0, heinous: 0 };
      buckets[key].total++;
      if (String(c.GravityOffenceID) === String(heinousId)) buckets[key].heinous++;
    });

    // Build a sorted month axis so we can compute rolling features per district
    const allMonths = [...new Set(Object.keys(buckets).map(k => k.split('|')[1]))].sort();
    const allDistricts = [...new Set(districts.map(d => d.District.DistrictName))];

    const rows = [];
    allDistricts.forEach(dName => {
      allMonths.forEach((month, idx) => {
        const key = `${dName}|${month}`;
        const current = buckets[key] || { total: 0, heinous: 0 };

        // Prior month + rolling 3-month average as predictive features
        const priorMonth = idx > 0 ? allMonths[idx - 1] : null;
        const priorTotal = priorMonth ? (buckets[`${dName}|${priorMonth}`]?.total || 0) : 0;

        const last3 = allMonths.slice(Math.max(0, idx - 3), idx);
        const rolling3Avg = last3.length > 0
          ? last3.reduce((s, m) => s + (buckets[`${dName}|${m}`]?.total || 0), 0) / last3.length
          : 0;

        const monthNum = parseInt(month.split('-')[1]);
        const heinousRatio = current.total > 0 ? current.heinous / current.total : 0;

        // Label: is THIS month's volume >= 1.5x the district's rolling average? (what we're teaching the model to predict)
        const riskLabel = current.total >= rolling3Avg * 1.5 && current.total >= 3 ? 'High' : 'Normal';

        rows.push({
          district: dName,
          month_number: monthNum,
          prior_month_count: priorTotal,
          rolling_3month_avg: Math.round(rolling3Avg * 100) / 100,
          heinous_ratio: Math.round(heinousRatio * 100) / 100,
          current_month_count: current.total,
          risk_label: riskLabel
        });
      });
    });

    // Only keep rows with enough history to be meaningful
    const cleanRows = rows.filter(r => r.rolling_3month_avg > 0 || r.prior_month_count > 0);

    const headers = ['district', 'month_number', 'prior_month_count', 'rolling_3month_avg', 'heinous_ratio', 'current_month_count', 'risk_label'];
    const csvLines = [headers.join(',')];
    cleanRows.forEach(r => {
      csvLines.push(headers.map(h => r[h]).join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="risk_training_data.csv"');
    res.status(200).send(csvLines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
app.get('/ml/anomalies', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const cases = await fetchAll(zcql, "SELECT ROWID, CrimeNo, PoliceStationID, CrimeMajorHeadID, CrimeRegisteredDate, IncidentFromDate FROM CaseMaster", 'CaseMaster');
    const units = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Unit LIMIT 300");
    const districts = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300");
    const crimeHeads = await zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead LIMIT 300");

    const unitToDistrict = {};
    units.forEach(u => { unitToDistrict[String(u.Unit.ROWID)] = String(u.Unit.DistrictID); });
    const districtName = {};
    districts.forEach(d => { districtName[String(d.District.ROWID)] = d.District.DistrictName; });
    const crimeHeadName = {};
    crimeHeads.forEach(c => { crimeHeadName[String(c.CrimeHead.ROWID)] = c.CrimeHead.CrimeGroupName; });

    // Baseline: expected crime-type distribution per district (overall proportions)
    const districtCrimeCounts = {};
    const districtTotals = {};
    cases.forEach(row => {
      const c = row.CaseMaster;
      const dName = districtName[unitToDistrict[String(c.PoliceStationID)]] || 'Unknown';
      const hName = crimeHeadName[String(c.CrimeMajorHeadID)] || 'Unknown';
      districtTotals[dName] = (districtTotals[dName] || 0) + 1;
      if (!districtCrimeCounts[dName]) districtCrimeCounts[dName] = {};
      districtCrimeCounts[dName][hName] = (districtCrimeCounts[dName][hName] || 0) + 1;
    });

    const anomalies = [];

    // Flag 1: crime type appearing in a district where it's rare (<5% of that district's cases) but did occur
    Object.entries(districtCrimeCounts).forEach(([dName, crimeCounts]) => {
      const total = districtTotals[dName];
      Object.entries(crimeCounts).forEach(([hName, count]) => {
        const ratio = count / total;
        if (ratio < 0.05 && total >= 10) {
          anomalies.push({
            type: 'unusual_crime_type_for_district',
            district: dName,
            crimeHead: hName,
            detail: `${hName} accounts for only ${(ratio * 100).toFixed(1)}% of cases in ${dName} — statistically unusual for this district`,
            severity: 'medium'
          });
        }
      });
    });

    // Flag 2: cases logged with an unusually large gap between incident and registration (>30 days)
    cases.forEach(row => {
      const c = row.CaseMaster;
      if (!c.IncidentFromDate || !c.CrimeRegisteredDate) return;
      const incidentDate = new Date(c.IncidentFromDate);
      const registeredDate = new Date(c.CrimeRegisteredDate);
      const gapDays = (registeredDate - incidentDate) / (1000 * 60 * 60 * 24);
      if (gapDays > 30) {
        anomalies.push({
          type: 'delayed_reporting',
          crimeNo: c.CrimeNo,
          district: districtName[unitToDistrict[String(c.PoliceStationID)]] || 'Unknown',
          detail: `${Math.round(gapDays)}-day gap between incident and registration — worth reviewing for delayed reporting patterns`,
          severity: gapDays > 90 ? 'high' : 'medium'
        });
      }
    });

    res.status(200).json({
      totalAnomalies: anomalies.length,
      anomalies: anomalies.sort((a, b) => (a.severity === 'high' ? -1 : 1))
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get('/ml/risk-scores', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const cases = await fetchAll(zcql, "SELECT ROWID, PoliceStationID, GravityOffenceID, CrimeRegisteredDate FROM CaseMaster", 'CaseMaster');
    const units = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Unit LIMIT 300");
    const districts = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300");
    const gravities = await zcql.executeZCQLQuery("SELECT ROWID, LookupValue FROM GravityOffence LIMIT 300");

    const unitToDistrict = {};
    units.forEach(u => { unitToDistrict[String(u.Unit.ROWID)] = String(u.Unit.DistrictID); });
    const districtName = {};
    districts.forEach(d => { districtName[String(d.District.ROWID)] = d.District.DistrictName; });
    const heinousId = gravities.find(g => g.GravityOffence.LookupValue === 'Heinous')?.GravityOffence.ROWID;

    const buckets = {};
    cases.forEach(row => {
      const c = row.CaseMaster;
      if (!c.CrimeRegisteredDate) return;
      const dName = districtName[unitToDistrict[String(c.PoliceStationID)]] || 'Unknown';
      const month = c.CrimeRegisteredDate.substring(0, 7);
      const key = `${dName}|${month}`;
      if (!buckets[key]) buckets[key] = { total: 0, heinous: 0 };
      buckets[key].total++;
      if (String(c.GravityOffenceID) === String(heinousId)) buckets[key].heinous++;
    });

    const allMonths = [...new Set(Object.keys(buckets).map(k => k.split('|')[1]))].sort();
    const latestMonth = allMonths[allMonths.length - 1];
    const allDistricts = [...new Set(districts.map(d => d.District.DistrictName))];

    const results = allDistricts.map(dName => {
      const currentKey = `${dName}|${latestMonth}`;
      const current = buckets[currentKey] || { total: 0, heinous: 0 };
      const monthIdx = allMonths.indexOf(latestMonth);
      const last3 = allMonths.slice(Math.max(0, monthIdx - 3), monthIdx);
      const rolling3Avg = last3.length > 0
        ? last3.reduce((s, m) => s + (buckets[`${dName}|${m}`]?.total || 0), 0) / last3.length
        : 0;
      const heinousRatio = current.total > 0 ? current.heinous / current.total : 0;

      // Same logic used to derive the training label in Module 7 Step 1 —
      // volume spike (>=1.5x rolling average, minimum 3 cases) drives High risk;
      // a high heinous-offence ratio independently elevates risk too
      let riskLevel = 'Normal';
      const reasons = [];
      if (current.total >= rolling3Avg * 1.5 && current.total >= 3) {
        riskLevel = 'High';
        reasons.push(`case volume (${current.total}) is ${(current.total / (rolling3Avg || 1)).toFixed(1)}x the 3-month rolling average (${rolling3Avg.toFixed(1)})`);
      }
      if (heinousRatio >= 0.4 && current.total >= 2) {
        riskLevel = 'High';
        reasons.push(`${(heinousRatio * 100).toFixed(0)}% of this month's cases are heinous offences`);
      }

      return {
        district: dName,
        riskLevel,
        reasons,
        currentMonthCount: current.total,
        rolling3MonthAvg: Math.round(rolling3Avg * 100) / 100,
        heinousRatio: Math.round(heinousRatio * 100) / 100
      };
    });

    res.status(200).json({
      month: latestMonth,
      method: 'rule-based scoring (Zia AutoML pipeline trained and validated separately — see docs/module7-ml-notes.md)',
      results: results.sort((a, b) => (b.riskLevel === 'High' ? 1 : 0) - (a.riskLevel === 'High' ? 1 : 0))
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get('/ml/export-narratives', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const cases = await fetchAll(zcql, "SELECT ROWID, CrimeNo, CrimeRegisteredDate, CrimeMajorHeadID, CaseStatusID, PoliceStationID, BriefFacts FROM CaseMaster", 'CaseMaster');
    const units = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Unit LIMIT 300");
    const districts = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300");
    const crimeHeads = await zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead LIMIT 300");
    const statuses = await zcql.executeZCQLQuery("SELECT ROWID, CaseStatusName FROM CaseStatusMaster LIMIT 300");

    const unitToDistrict = {};
    units.forEach(u => { unitToDistrict[String(u.Unit.ROWID)] = String(u.Unit.DistrictID); });
    const districtName = {};
    districts.forEach(d => { districtName[String(d.District.ROWID)] = d.District.DistrictName; });
    const crimeHeadName = {};
    crimeHeads.forEach(c => { crimeHeadName[String(c.CrimeHead.ROWID)] = c.CrimeHead.CrimeGroupName; });
    const statusName = {};
    statuses.forEach(s => { statusName[String(s.CaseStatusMaster.ROWID)] = s.CaseStatusMaster.CaseStatusName; });

    const lines = cases.map(row => {
      const c = row.CaseMaster;
      const dName = districtName[unitToDistrict[String(c.PoliceStationID)]] || 'Unknown';
      const hName = crimeHeadName[String(c.CrimeMajorHeadID)] || 'Unknown';
      const sName = statusName[String(c.CaseStatusID)] || 'Unknown';
      return `Case ${c.CrimeNo} | District: ${dName} | Crime Type: ${hName} | Status: ${sName} | Registered: ${c.CrimeRegisteredDate}\n${c.BriefFacts}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="case_narratives.txt"');
    res.status(200).send(lines.join('\n---\n\n'));
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/copilot/ask', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const segment = catalystApp.cache().segment('RagAuth');

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const clientId = await segment.getValue('client_id');
    const clientSecret = await segment.getValue('client_secret');
    const refreshToken = await segment.getValue('refresh_token');

    // Mint a fresh access token from the refresh token on every call —
    // simpler and safer than caching a short-lived token near its expiry boundary
    const tokenResp = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      })
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return res.status(502).json({ error: 'Failed to mint access token', details: tokenData });
    }

    const ragResp = await fetch(
      'https://api.catalyst.zoho.in/quickml/v1/project/53381000000063052/rag/answer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CATALYST-ORG': '60078535319',
          'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`
        },
        body: JSON.stringify({
          query,
          documents: ['7442000000005042']
        })
      }
    );
    const ragData = await ragResp.json();

    if (ragData.status !== 'success') {
      return res.status(502).json({ error: 'RAG call failed', details: ragData });
    }

    res.status(200).json({
      answer: ragData.response,
      sources: ragData.retrieved_nodes
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get('/reports/case-summary', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const smartbrowz = catalystApp.smartbrowz();
    const zcql = catalystApp.zcql();

    const cases = await fetchAll(zcql, "SELECT ROWID, CrimeMajorHeadID, CaseStatusID, PoliceStationID FROM CaseMaster", 'CaseMaster');
    const units = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Unit LIMIT 300");
    const districts = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District LIMIT 300");
    const crimeHeads = await zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead LIMIT 300");

    const unitToDistrict = {};
    units.forEach(u => { unitToDistrict[String(u.Unit.ROWID)] = String(u.Unit.DistrictID); });
    const districtName = {};
    districts.forEach(d => { districtName[String(d.District.ROWID)] = d.District.DistrictName; });
    const crimeHeadName = {};
    crimeHeads.forEach(c => { crimeHeadName[String(c.CrimeHead.ROWID)] = c.CrimeHead.CrimeGroupName; });

    const byDistrict = {};
    const byCrimeHead = {};
    cases.forEach(row => {
      const c = row.CaseMaster;
      const dName = districtName[unitToDistrict[String(c.PoliceStationID)]] || 'Unknown';
      const hName = crimeHeadName[String(c.CrimeMajorHeadID)] || 'Unknown';
      byDistrict[dName] = (byDistrict[dName] || 0) + 1;
      byCrimeHead[hName] = (byCrimeHead[hName] || 0) + 1;
    });

    const topDistricts = Object.entries(byDistrict).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topCrimeHeads = Object.entries(byCrimeHead).sort((a, b) => b[1] - a[1]);

    const html = `
      <html><head><style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
        h1 { color: #1a2332; border-bottom: 2px solid #1a2332; padding-bottom: 8px; }
        h2 { color: #333; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #ddd; }
        th { background: #f0f2f5; }
        .meta { color: #666; font-size: 0.9em; }
      </style></head>
      <body>
        <h1>KSP Crime Intelligence Report</h1>
        <p class="meta">Generated: ${new Date().toISOString().split('T')[0]} | Total Cases: ${cases.length}</p>
        <h2>Top Districts by Case Volume</h2>
        <table>
          <tr><th>District</th><th>Case Count</th></tr>
          ${topDistricts.map(([name, count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join('')}
        </table>
        <h2>Cases by Crime Category</h2>
        <table>
          <tr><th>Category</th><th>Case Count</th></tr>
          ${topCrimeHeads.map(([name, count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join('')}
        </table>
      </body></html>
    `;

  let result;
      try {
        result = await smartbrowz.convertToPdf(html, {
          pdf_options: { format: 'A4' }
        });
      } catch (pdfErr) {
        return res.status(500).json({
          stage: 'convertToPdf',
          message: pdfErr.message,
          code: pdfErr.code
        });
      }

      if (result.statusCode && result.statusCode >= 400) {
        const chunks = [];
        for await (const chunk of result) chunks.push(chunk);
        const errorBody = Buffer.concat(chunks).toString('utf8');
        return res.status(502).json({ error: 'SmartBrowz returned an error', statusCode: result.statusCode, body: errorBody });
      }

      const chunks = [];
      for await (const chunk of result) chunks.push(chunk);
      const pdfBuffer = Buffer.concat(chunks);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="crime_intelligence_report.pdf"');
      res.status(200).send(pdfBuffer);
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
});


module.exports = app;