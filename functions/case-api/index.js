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

    const countQuery = `SELECT ROWID FROM CaseMaster ${whereClause} LIMIT 300`;
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
      // still need crimeHeadName map for hotspotPoints even on a cache hit
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

module.exports = app;