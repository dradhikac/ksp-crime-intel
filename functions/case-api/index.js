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

module.exports = app;