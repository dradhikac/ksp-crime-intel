'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();

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

module.exports = app;