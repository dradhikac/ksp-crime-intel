'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();
app.use(express.json());

app.post('/lookups', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();

    async function seed(tableName, rows) {
      const table = datastore.table(tableName);
      const inserted = await table.insertRows(rows);
      return { table: tableName, count: inserted.length };
    }

    const results = [];

    results.push(await seed('State', [
      { StateName: 'Karnataka', NationalityID: 1, Active: true }
    ]));

    results.push(await seed('UnitType', [
      { UnitTypeName: 'Police Station', CityDistState: 'City', Hierarchy: 1, Active: true },
      { UnitTypeName: 'Circle Office', CityDistState: 'District', Hierarchy: 2, Active: true },
      { UnitTypeName: 'Sub-Division Office', CityDistState: 'District', Hierarchy: 3, Active: true },
      { UnitTypeName: 'District SP Office', CityDistState: 'District', Hierarchy: 4, Active: true },
      { UnitTypeName: 'Range Office', CityDistState: 'State', Hierarchy: 5, Active: true },
      { UnitTypeName: 'State Headquarters', CityDistState: 'State', Hierarchy: 6, Active: true }
    ]));

    results.push(await seed('Rank', [
      { RankName: 'Constable', Hierarchy: 1, Active: true },
      { RankName: 'Head Constable', Hierarchy: 2, Active: true },
      { RankName: 'Assistant Sub-Inspector', Hierarchy: 3, Active: true },
      { RankName: 'Sub-Inspector', Hierarchy: 4, Active: true },
      { RankName: 'Inspector', Hierarchy: 5, Active: true },
      { RankName: 'Deputy Superintendent of Police', Hierarchy: 6, Active: true },
      { RankName: 'Superintendent of Police', Hierarchy: 7, Active: true },
      { RankName: 'Deputy Inspector General', Hierarchy: 8, Active: true },
      { RankName: 'Inspector General', Hierarchy: 9, Active: true },
      { RankName: 'Director General of Police', Hierarchy: 10, Active: true }
    ]));

    results.push(await seed('Designation', [
      { DesignationName: 'Station House Officer', Active: true, SortOrder: 1 },
      { DesignationName: 'Investigating Officer', Active: true, SortOrder: 2 },
      { DesignationName: 'Beat Officer', Active: true, SortOrder: 3 },
      { DesignationName: 'Circle Inspector', Active: true, SortOrder: 4 },
      { DesignationName: 'Station Writer', Active: true, SortOrder: 5 }
    ]));

    results.push(await seed('CaseCategory', [
      { LookupValue: 'FIR' },
      { LookupValue: 'UDR' },
      { LookupValue: 'PAR' },
      { LookupValue: 'Zero FIR' }
    ]));

    results.push(await seed('GravityOffence', [
      { LookupValue: 'Heinous' },
      { LookupValue: 'Non-Heinous' }
    ]));

    results.push(await seed('CaseStatusMaster', [
      { CaseStatusName: 'Under Investigation' },
      { CaseStatusName: 'Charge Sheeted' },
      { CaseStatusName: 'Closed' },
      { CaseStatusName: 'Undetected' },
      { CaseStatusName: 'False Case' },
      { CaseStatusName: 'Pending Court Trial' }
    ]));

    results.push(await seed('CasteMaster', [
      { caste_master_name: 'General' },
      { caste_master_name: 'OBC' },
      { caste_master_name: 'SC' },
      { caste_master_name: 'ST' },
      { caste_master_name: 'Category-1' },
      { caste_master_name: 'Category-2A' }
    ]));

    results.push(await seed('ReligionMaster', [
      { ReligionName: 'Hindu' },
      { ReligionName: 'Muslim' },
      { ReligionName: 'Christian' },
      { ReligionName: 'Sikh' },
      { ReligionName: 'Buddhist' },
      { ReligionName: 'Jain' },
      { ReligionName: 'Other' }
    ]));

    results.push(await seed('OccupationMaster', [
      { OccupationName: 'Farmer' },
      { OccupationName: 'Government Employee' },
      { OccupationName: 'Private Employee' },
      { OccupationName: 'Business' },
      { OccupationName: 'Unemployed' },
      { OccupationName: 'Student' },
      { OccupationName: 'Daily Wage Labourer' },
      { OccupationName: 'Homemaker' },
      { OccupationName: 'Retired' }
    ]));

    results.push(await seed('Act', [
      { ActCode: 'IPC', ActDescription: 'Indian Penal Code', ShortName: 'IPC', Active: true },
      { ActCode: 'BNS', ActDescription: 'Bharatiya Nyaya Sanhita', ShortName: 'BNS', Active: true },
      { ActCode: 'NDPS', ActDescription: 'Narcotic Drugs and Psychotropic Substances Act', ShortName: 'NDPS', Active: true },
      { ActCode: 'POCSO', ActDescription: 'Protection of Children from Sexual Offences Act', ShortName: 'POCSO', Active: true },
      { ActCode: 'MVACT', ActDescription: 'Motor Vehicles Act', ShortName: 'MV Act', Active: true },
      { ActCode: 'ARMS', ActDescription: 'Arms Act', ShortName: 'Arms Act', Active: true },
      { ActCode: 'ITACT', ActDescription: 'Information Technology Act', ShortName: 'IT Act', Active: true }
    ]));

    results.push(await seed('CrimeHead', [
      { CrimeGroupName: 'Crimes Against Body', Active: true },
      { CrimeGroupName: 'Crimes Against Property', Active: true },
      { CrimeGroupName: 'Crimes Against Women', Active: true },
      { CrimeGroupName: 'Crimes Against Children', Active: true },
      { CrimeGroupName: 'Economic Offences', Active: true },
      { CrimeGroupName: 'Cyber Crimes', Active: true },
      { CrimeGroupName: 'Crimes Against Public Order', Active: true },
      { CrimeGroupName: 'Special & Local Laws', Active: true }
    ]));

    res.status(200).json({ status: 'seeded', results });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/layer1', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();

    const stateRows = await catalystApp.zcql().executeZCQLQuery(
      "SELECT ROWID, StateName FROM State WHERE StateName = 'Karnataka'"
    );
    const karnatakaId = stateRows[0].State.ROWID;

    const crimeHeadRows = await catalystApp.zcql().executeZCQLQuery(
      "SELECT ROWID, CrimeGroupName FROM CrimeHead"
    );
    const headMap = {};
    crimeHeadRows.forEach(r => { headMap[r.CrimeHead.CrimeGroupName] = r.CrimeHead.ROWID; });

    const districtNames = [
      'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
      'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
      'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri',
      'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur',
      'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada',
      'Vijayapura', 'Vijayanagara', 'Yadgir'
    ];
    const districtRows = districtNames.map(name => ({
      DistrictName: name, StateID: karnatakaId, Active: true
    }));
    const districtTable = datastore.table('District');
    const insertedDistricts = await districtTable.insertRows(districtRows);

    const sectionRows = [
      { ActCode: 'IPC', SectionCode: '302', SectionDescription: 'Murder', Active: true },
      { ActCode: 'IPC', SectionCode: '307', SectionDescription: 'Attempt to Murder', Active: true },
      { ActCode: 'IPC', SectionCode: '376', SectionDescription: 'Rape', Active: true },
      { ActCode: 'IPC', SectionCode: '354', SectionDescription: 'Assault on Woman with Intent to Outrage Modesty', Active: true },
      { ActCode: 'IPC', SectionCode: '379', SectionDescription: 'Theft', Active: true },
      { ActCode: 'IPC', SectionCode: '392', SectionDescription: 'Robbery', Active: true },
      { ActCode: 'IPC', SectionCode: '420', SectionDescription: 'Cheating', Active: true },
      { ActCode: 'IPC', SectionCode: '498A', SectionDescription: 'Cruelty by Husband or Relatives', Active: true },
      { ActCode: 'IPC', SectionCode: '323', SectionDescription: 'Voluntarily Causing Hurt', Active: true },
      { ActCode: 'NDPS', SectionCode: '20', SectionDescription: 'Possession of Cannabis/Ganja', Active: true },
      { ActCode: 'POCSO', SectionCode: '4', SectionDescription: 'Penetrative Sexual Assault on a Child', Active: true },
      { ActCode: 'MVACT', SectionCode: '184', SectionDescription: 'Dangerous Driving', Active: true },
      { ActCode: 'ARMS', SectionCode: '25', SectionDescription: 'Illegal Possession of Arms', Active: true },
      { ActCode: 'ITACT', SectionCode: '66C', SectionDescription: 'Identity Theft', Active: true }
    ];
    const sectionTable = datastore.table('Section');
    const insertedSections = await sectionTable.insertRows(sectionRows);

    const subHeadRows = [
      { CrimeHeadID: headMap['Crimes Against Body'], CrimeHeadName: 'Murder', SeqID: 1 },
      { CrimeHeadID: headMap['Crimes Against Body'], CrimeHeadName: 'Attempt to Murder', SeqID: 2 },
      { CrimeHeadID: headMap['Crimes Against Body'], CrimeHeadName: 'Grievous Hurt', SeqID: 3 },
      { CrimeHeadID: headMap['Crimes Against Property'], CrimeHeadName: 'Theft', SeqID: 1 },
      { CrimeHeadID: headMap['Crimes Against Property'], CrimeHeadName: 'Robbery', SeqID: 2 },
      { CrimeHeadID: headMap['Crimes Against Property'], CrimeHeadName: 'Burglary', SeqID: 3 },
      { CrimeHeadID: headMap['Crimes Against Women'], CrimeHeadName: 'Rape', SeqID: 1 },
      { CrimeHeadID: headMap['Crimes Against Women'], CrimeHeadName: 'Dowry Death', SeqID: 2 },
      { CrimeHeadID: headMap['Crimes Against Women'], CrimeHeadName: 'Cruelty by Husband/Relatives', SeqID: 3 },
      { CrimeHeadID: headMap['Crimes Against Children'], CrimeHeadName: 'POCSO Offences', SeqID: 1 },
      { CrimeHeadID: headMap['Crimes Against Children'], CrimeHeadName: 'Missing Children', SeqID: 2 },
      { CrimeHeadID: headMap['Economic Offences'], CrimeHeadName: 'Cheating', SeqID: 1 },
      { CrimeHeadID: headMap['Economic Offences'], CrimeHeadName: 'Criminal Breach of Trust', SeqID: 2 },
      { CrimeHeadID: headMap['Cyber Crimes'], CrimeHeadName: 'Online Fraud', SeqID: 1 },
      { CrimeHeadID: headMap['Cyber Crimes'], CrimeHeadName: 'Identity Theft', SeqID: 2 },
      { CrimeHeadID: headMap['Crimes Against Public Order'], CrimeHeadName: 'Rioting', SeqID: 1 },
      { CrimeHeadID: headMap['Special & Local Laws'], CrimeHeadName: 'NDPS Offences', SeqID: 1 },
      { CrimeHeadID: headMap['Special & Local Laws'], CrimeHeadName: 'Arms Act Offences', SeqID: 2 }
    ];
    const subHeadTable = datastore.table('CrimeSubHead');
    const insertedSubHeads = await subHeadTable.insertRows(subHeadRows);

    res.status(200).json({
      status: 'seeded',
      results: [
        { table: 'District', count: insertedDistricts.length },
        { table: 'Section', count: insertedSections.length },
        { table: 'CrimeSubHead', count: insertedSubHeads.length }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/layer2', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const zcql = catalystApp.zcql();

    const stateRows = await zcql.executeZCQLQuery(
      "SELECT ROWID, StateName FROM State WHERE StateName = 'Karnataka'"
    );
    const karnatakaId = stateRows[0].State.ROWID;

    const unitTypeRows = await zcql.executeZCQLQuery(
      "SELECT ROWID, UnitTypeName FROM UnitType WHERE UnitTypeName = 'Police Station'"
    );
    const policeStationTypeId = unitTypeRows[0].UnitType.ROWID;

    const districtRows = await zcql.executeZCQLQuery(
      "SELECT ROWID, DistrictName FROM District"
    );

    const unitRowsData = districtRows.map(r => ({
      UnitName: `${r.District.DistrictName} Town Police Station`,
      TypeID: policeStationTypeId,
      StateID: karnatakaId,
      DistrictID: r.District.ROWID,
      Active: true
    }));
    const insertedUnits = await datastore.table('Unit').insertRows(unitRowsData);

    const courtRowsData = districtRows.map(r => ({
      CourtName: `${r.District.DistrictName} District & Sessions Court`,
      DistrictID: r.District.ROWID,
      StateID: karnatakaId,
      Active: true
    }));
    const insertedCourts = await datastore.table('Court').insertRows(courtRowsData);

    const crimeHeadRows = await zcql.executeZCQLQuery(
      "SELECT ROWID, CrimeGroupName FROM CrimeHead"
    );
    const headMap = {};
    crimeHeadRows.forEach(r => { headMap[r.CrimeHead.CrimeGroupName] = r.CrimeHead.ROWID; });

    const mappingRows = [
      { CrimeHeadID: headMap['Crimes Against Body'], ActCode: 'IPC', SectionCode: '302' },
      { CrimeHeadID: headMap['Crimes Against Body'], ActCode: 'IPC', SectionCode: '307' },
      { CrimeHeadID: headMap['Crimes Against Body'], ActCode: 'IPC', SectionCode: '323' },
      { CrimeHeadID: headMap['Crimes Against Property'], ActCode: 'IPC', SectionCode: '379' },
      { CrimeHeadID: headMap['Crimes Against Property'], ActCode: 'IPC', SectionCode: '392' },
      { CrimeHeadID: headMap['Crimes Against Women'], ActCode: 'IPC', SectionCode: '376' },
      { CrimeHeadID: headMap['Crimes Against Women'], ActCode: 'IPC', SectionCode: '354' },
      { CrimeHeadID: headMap['Crimes Against Women'], ActCode: 'IPC', SectionCode: '498A' },
      { CrimeHeadID: headMap['Crimes Against Children'], ActCode: 'POCSO', SectionCode: '4' },
      { CrimeHeadID: headMap['Economic Offences'], ActCode: 'IPC', SectionCode: '420' },
      { CrimeHeadID: headMap['Cyber Crimes'], ActCode: 'ITACT', SectionCode: '66C' },
      { CrimeHeadID: headMap['Special & Local Laws'], ActCode: 'NDPS', SectionCode: '20' },
      { CrimeHeadID: headMap['Special & Local Laws'], ActCode: 'ARMS', SectionCode: '25' }
    ];
    const insertedMappings = await datastore.table('CrimeHeadActSection').insertRows(mappingRows);

    res.status(200).json({
      status: 'seeded',
      results: [
        { table: 'Unit', count: insertedUnits.length },
        { table: 'Court', count: insertedCourts.length },
        { table: 'CrimeHeadActSection', count: insertedMappings.length }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/layer3', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const zcql = catalystApp.zcql();

    const unitRows = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID, UnitName FROM Unit LIMIT 300");
    const rankRows = await zcql.executeZCQLQuery("SELECT ROWID, RankName FROM Rank");
    const designationRows = await zcql.executeZCQLQuery("SELECT ROWID, DesignationName FROM Designation");

    const rankByName = {};
    rankRows.forEach(r => { rankByName[r.Rank.RankName] = r.Rank.ROWID; });
    const designationByName = {};
    designationRows.forEach(r => { designationByName[r.Designation.DesignationName] = r.Designation.ROWID; });

    const firstNames = [
      'Arjun', 'Vikram', 'Suresh', 'Ravi', 'Manjunath', 'Prakash', 'Ganesh',
      'Nagesh', 'Srinivas', 'Basavaraj', 'Lakshmi', 'Kavya', 'Sunitha', 'Deepa',
      'Anitha', 'Shwetha', 'Pooja', 'Rekha', 'Chandrashekar', 'Mahesh'
    ];

    function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randomDate(startYear, endYear) {
      const year = startYear + Math.floor(Math.random() * (endYear - startYear));
      const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
      const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const roleTemplate = [
      { rank: 'Inspector', designation: 'Station House Officer' },
      { rank: 'Sub-Inspector', designation: 'Investigating Officer' },
      { rank: 'Head Constable', designation: 'Beat Officer' },
      { rank: 'Constable', designation: 'Beat Officer' }
    ];

    const employeeRowsData = [];
    let kgidCounter = 100001;

    unitRows.forEach(u => {
      roleTemplate.forEach(role => {
        employeeRowsData.push({
          DistrictID: u.Unit.DistrictID,
          UnitID: u.Unit.ROWID,
          RankID: rankByName[role.rank],
          DesignationID: designationByName[role.designation],
          KGID: `KGID${kgidCounter++}`,
          FirstName: randomFrom(firstNames),
          EmployeeDOB: randomDate(1970, 1995),
          GenderID: Math.random() < 0.85 ? 1 : 2,
          BloodGroupID: 1 + Math.floor(Math.random() * 8),
          PhysicallyChallenged: false,
          AppointmentDate: randomDate(1996, 2020)
        });
      });
    });

    const table = datastore.table('Employee');
    let totalInserted = 0;
    for (let i = 0; i < employeeRowsData.length; i += 100) {
      const batch = employeeRowsData.slice(i, i + 100);
      const inserted = await table.insertRows(batch);
      totalInserted += inserted.length;
    }

    res.status(200).json({ status: 'seeded', results: [{ table: 'Employee', count: totalInserted }] });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/layer4', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const zcql = catalystApp.zcql();

    const districtCenters = {
      'Bagalkot': [16.18, 75.70], 'Ballari': [15.14, 76.92], 'Belagavi': [15.85, 74.50],
      'Bengaluru Rural': [13.23, 77.48], 'Bengaluru Urban': [12.97, 77.59], 'Bidar': [17.91, 77.52],
      'Chamarajanagar': [11.92, 76.94], 'Chikkaballapur': [13.43, 77.73], 'Chikkamagaluru': [13.32, 75.77],
      'Chitradurga': [14.23, 76.40], 'Dakshina Kannada': [12.87, 74.88], 'Davanagere': [14.46, 75.92],
      'Dharwad': [15.46, 75.01], 'Gadag': [15.43, 75.63], 'Hassan': [13.01, 76.10],
      'Haveri': [14.79, 75.40], 'Kalaburagi': [17.33, 76.84], 'Kodagu': [12.42, 75.74],
      'Kolar': [13.14, 78.13], 'Koppal': [15.35, 76.15], 'Mandya': [12.52, 76.90],
      'Mysuru': [12.30, 76.65], 'Raichur': [16.21, 77.36], 'Ramanagara': [12.72, 77.28],
      'Shivamogga': [13.93, 75.57], 'Tumakuru': [13.34, 77.10], 'Udupi': [13.34, 74.75],
      'Uttara Kannada': [14.80, 74.70], 'Vijayapura': [16.83, 75.71], 'Vijayanagara': [15.28, 76.46],
      'Yadgir': [16.77, 77.14]
    };
    const hotspotDistricts = ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Kalaburagi', 'Dakshina Kannada'];

    const districtRows = await zcql.executeZCQLQuery("SELECT ROWID, DistrictName FROM District");
    const unitRows = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID, UnitName FROM Unit LIMIT 300");
    const employeeRows = await zcql.executeZCQLQuery("SELECT ROWID, UnitID, DesignationID FROM Employee");
    const designationRows = await zcql.executeZCQLQuery("SELECT ROWID, DesignationName FROM Designation");
    const categoryRows = await zcql.executeZCQLQuery("SELECT ROWID, LookupValue FROM CaseCategory");
    const gravityRows = await zcql.executeZCQLQuery("SELECT ROWID, LookupValue FROM GravityOffence");
    const statusRows = await zcql.executeZCQLQuery("SELECT ROWID, CaseStatusName FROM CaseStatusMaster");
    const courtRows = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID FROM Court");
    const headRows = await zcql.executeZCQLQuery("SELECT ROWID, CrimeGroupName FROM CrimeHead");
    const subHeadRows = await zcql.executeZCQLQuery("SELECT ROWID, CrimeHeadID, CrimeHeadName FROM CrimeSubHead");
	console.log('districtRows:', districtRows.length);
	console.log('unitRows:', unitRows.length);
	console.log('employeeRows:', employeeRows.length);
	console.log('courtRows:', courtRows.length);
	console.log('categoryRows:', categoryRows.length);
	console.log('gravityRows:', gravityRows.length);
	console.log('statusRows:', statusRows.length);
	console.log('headRows:', headRows.length);
	console.log('subHeadRows:', subHeadRows.length);

	if (districtRows.length !== 31) throw new Error(`Expected 31 districts, got ${districtRows.length}`);
	if (unitRows.length !== 31) throw new Error(`Expected 31 units, got ${unitRows.length}`);
	if (courtRows.length !== 31) throw new Error(`Expected 31 courts, got ${courtRows.length}`);
	if (employeeRows.length !== 124) throw new Error(`Expected 124 employees, got ${employeeRows.length}`);
		const shoDesignationId = designationRows.find(d => d.Designation.DesignationName === 'Station House Officer').Designation.ROWID;

    const districtCode = {};
    districtRows.forEach((r, i) => { districtCode[r.District.ROWID] = String(i + 1).padStart(4, '0'); });

    const categoryCodeMap = { 'FIR': '1', 'UDR': '3', 'PAR': '4', 'Zero FIR': '8' };
    const categoryWeight = { 'FIR': 85, 'UDR': 5, 'PAR': 5, 'Zero FIR': 5 };
    const subHeadWeight = {
      'Theft': 20, 'Robbery': 8, 'Burglary': 8, 'Cheating': 10, 'Criminal Breach of Trust': 5,
      'Online Fraud': 8, 'Identity Theft': 4, 'Rioting': 5, 'Grievous Hurt': 8,
      'Attempt to Murder': 4, 'Murder': 3, 'Rape': 5, 'Dowry Death': 2,
      'Cruelty by Husband/Relatives': 6, 'POCSO Offences': 4, 'Missing Children': 5,
      'NDPS Offences': 6, 'Arms Act Offences': 3
    };
    const moPhrases = {
      'Theft': 'unidentified suspect(s) entered the premises and removed valuables while the occupants were away',
      'Robbery': 'suspect(s) approached the victim on a two-wheeler and snatched belongings before fleeing',
      'Burglary': 'lock was found broken and household items were reported missing on discovery',
      'Cheating': 'victim was contacted with a fraudulent investment offer and transferred funds before realizing the deception',
      'Online Fraud': 'victim received a phishing link and unauthorized transactions followed shortly after',
      'Identity Theft': "victim's personal credentials were used without authorization to access online accounts",
      'Murder': 'victim was found with fatal injuries following an altercation with the accused',
      'Attempt to Murder': 'accused attacked the victim with a weapon following a prior dispute',
      'Rape': 'victim reported the incident after being assaulted by the accused known to them',
      'Grievous Hurt': 'a physical altercation between the parties resulted in serious injury',
      'Rioting': 'a group assembled and caused a disturbance resulting in property damage',
      'NDPS Offences': 'accused was found in possession of banned substances during a routine check',
      'Arms Act Offences': 'accused was found in unauthorized possession of a firearm',
      'Cruelty by Husband/Relatives': 'complainant alleged sustained harassment by the accused over dowry demands',
      'Dowry Death': 'the death occurred under suspicious circumstances linked to dowry harassment',
      'POCSO Offences': 'a minor victim was subjected to abuse by a person known to the family',
      'Missing Children': 'a minor was reported missing by the family and has not returned home',
      'Criminal Breach of Trust': 'funds entrusted to the accused for a specific purpose were misappropriated'
    };

    function weightedPick(items, weightFn) {
      const weighted = items.map(i => ({ item: i, w: weightFn(i) }));
      const total = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      for (const x of weighted) { r -= x.w; if (r <= 0) return x.item; }
      return weighted[weighted.length - 1].item;
    }

    function pad(n, len) { return String(n).padStart(len, '0'); }
    function randomDateBetween(start, end) {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }
    function fmtDate(d) { return d.toISOString().split('T')[0]; }
    function fmtDateTime(d) { return d.toISOString().replace('T', ' ').substring(0, 19); }

    const serialCounters = {};
    const CASE_COUNT = 400;
    const rangeStart = new Date('2024-01-01');
    const rangeEnd = new Date('2026-06-30');

    const caseRows = [];
    for (let i = 0; i < CASE_COUNT; i++) {
      const isHotspot = Math.random() < 0.55;
      const districtName = isHotspot
        ? hotspotDistricts[Math.floor(Math.random() * hotspotDistricts.length)]
        : districtRows[Math.floor(Math.random() * districtRows.length)].District.DistrictName;
      const districtRow = districtRows.find(d => d.District.DistrictName === districtName);
      const districtId = districtRow.District.ROWID;

      const unit = unitRows.find(u => String(u.Unit.DistrictID) === String(districtId));
      if (!unit) throw new Error(`No unit found for district ${districtName} (${districtId})`);
      const unitId = unit.Unit.ROWID;

      const sho = employeeRows.find(e => String(e.Employee.UnitID) === String(unitId) && String(e.Employee.DesignationID) === String(shoDesignationId));
      if (!sho) throw new Error(`No SHO found for unit ${unitId}`);

      const court = courtRows.find(c => String(c.Court.DistrictID) === String(districtId));
      if (!court) throw new Error(`No court found for district ${districtId}`);

      const category = weightedPick(categoryRows, c => categoryWeight[c.CaseCategory.LookupValue] || 1);
      const gravity = gravityRows[Math.floor(Math.random() * gravityRows.length)];
      const status = statusRows[Math.floor(Math.random() * statusRows.length)];
      const subHead = weightedPick(subHeadRows, s => subHeadWeight[s.CrimeSubHead.CrimeHeadName] || 3);
      const head = headRows.find(h => String(h.CrimeHead.ROWID) === String(subHead.CrimeSubHead.CrimeHeadID));
      if (!head) throw new Error(`No crime head found for sub-head ${subHead.CrimeSubHead.CrimeHeadName}`);

      const registeredDate = randomDateBetween(rangeStart, rangeEnd);
      const year = registeredDate.getFullYear();
      const categoryCode = categoryCodeMap[category.CaseCategory.LookupValue];
      const key = `${unitId}_${categoryCode}_${year}`;
      serialCounters[key] = (serialCounters[key] || 0) + 1;
      const serial = pad(serialCounters[key], 5);
      const dCode = districtCode[districtId];
      const uCode = dCode;
      const crimeNo = `${categoryCode}${dCode}${uCode}${year}${serial}`;
      const caseNo = `${year}${serial}`;

      const [baseLat, baseLng] = districtCenters[districtName];
      let lat, lng;
      if (isHotspot && Math.random() < 0.6) {
        lat = baseLat + (Math.random() - 0.5) * 0.06;
        lng = baseLng + (Math.random() - 0.5) * 0.06;
      } else {
        lat = baseLat + (Math.random() - 0.5) * 0.3;
        lng = baseLng + (Math.random() - 0.5) * 0.3;
      }

      const isNightCrime = ['Theft', 'Robbery', 'Burglary'].includes(subHead.CrimeSubHead.CrimeHeadName);
      const incidentHour = isNightCrime
        ? (22 + Math.floor(Math.random() * 6)) % 24
        : Math.floor(Math.random() * 24);
      const incidentFrom = new Date(registeredDate);
      incidentFrom.setHours(incidentHour, Math.floor(Math.random() * 60), 0);
      const incidentTo = new Date(incidentFrom.getTime() + (30 + Math.random() * 180) * 60000);
      const infoReceived = new Date(incidentTo.getTime() + Math.random() * 6 * 3600000);

      const moText = moPhrases[subHead.CrimeSubHead.CrimeHeadName] || 'the incident was reported and is under investigation';

      caseRows.push({
        CrimeNo: crimeNo,
        CaseNo: caseNo,
        CrimeRegisteredDate: fmtDate(registeredDate),
        PolicePersonID: sho.Employee.ROWID,
        PoliceStationID: unitId,
        CaseCategoryID: category.CaseCategory.ROWID,
        GravityOffenceID: gravity.GravityOffence.ROWID,
        CrimeMajorHeadID: head.CrimeHead.ROWID,
        CrimeMinorHeadID: subHead.CrimeSubHead.ROWID,
        CaseStatusID: status.CaseStatusMaster.ROWID,
        CourtID: court.Court.ROWID,
        IncidentFromDate: fmtDateTime(incidentFrom),
        IncidentToDate: fmtDateTime(incidentTo),
        InfoReceivedPSDate: fmtDateTime(infoReceived),
        latitude: lat,
        longitude: lng,
        BriefFacts: `A case of ${subHead.CrimeSubHead.CrimeHeadName} was registered. As per the complaint, ${moText}.`
      });
    }

    const table = datastore.table('CaseMaster');
    let totalInserted = 0;
    for (let i = 0; i < caseRows.length; i += 100) {
      const batch = caseRows.slice(i, i + 100);
      const inserted = await table.insertRows(batch);
      totalInserted += inserted.length;
    }

    res.status(200).json({ status: 'seeded', results: [{ table: 'CaseMaster', count: totalInserted }] });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/layer5', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const zcql = catalystApp.zcql();

	async function fetchAll(query, tableKey) {
	let all = [];
	let offset = 0;
	while (true) {
		const page = await zcql.executeZCQLQuery(`${query} LIMIT ${offset},300`);
		all = all.concat(page);
		if (page.length < 300) break;
		offset += 300;
	}
	// De-dupe in case of any pagination boundary overlap
	const seen = new Set();
	return all.filter(row => {
		const id = row[tableKey].ROWID;
		if (seen.has(id)) return false;
		seen.add(id);
		return true;
	});
}

    const caseRows = await fetchAll("SELECT ROWID, CrimeMajorHeadID, CaseStatusID, PoliceStationID FROM CaseMaster", "CaseMaster");
    const statusRows = await zcql.executeZCQLQuery("SELECT ROWID, CaseStatusName FROM CaseStatusMaster LIMIT 300");
    const occupationRows = await zcql.executeZCQLQuery("SELECT ROWID, OccupationName FROM OccupationMaster LIMIT 300");
    const religionRows = await zcql.executeZCQLQuery("SELECT ROWID, ReligionName FROM ReligionMaster LIMIT 300");
    const casteRows = await zcql.executeZCQLQuery("SELECT ROWID, caste_master_name FROM CasteMaster LIMIT 300");
    const mappingRows = await zcql.executeZCQLQuery("SELECT ROWID, CrimeHeadID, ActCode, SectionCode FROM CrimeHeadActSection LIMIT 300");
    const employeeRows = await zcql.executeZCQLQuery("SELECT ROWID, UnitID FROM Employee LIMIT 300");

    if (caseRows.length !== 400) throw new Error(`Expected 400 cases, got ${caseRows.length}`);

    const statusIdByName = {};
    statusRows.forEach(r => { statusIdByName[r.CaseStatusMaster.CaseStatusName] = String(r.CaseStatusMaster.ROWID); });

    const chargeSheetedId = statusIdByName['Charge Sheeted'];
    const closedId = statusIdByName['Closed'];
    const undetectedId = statusIdByName['Undetected'];

    function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

    // ---- Repeat offender pool ----
    const offenderPool = [
      'Ravi Kumar', 'Suresh Naik', 'Manjunath Gowda', 'Iqbal Pasha', 'Chandru M',
      'Basavaraj Patil', 'Yusuf Sheikh', 'Praveen Reddy', 'Naveen Shetty', 'Faisal Khan',
      'Ramesh Yadav', 'Ashok Bhat', 'Sharath Kumar', 'Imran Ahmed', 'Dinesh Rao',
      'Gopal Krishna', 'Salim Sab', 'Vinay Kumar', 'Anwar Basha', 'Santosh Hegde'
    ].map(name => ({
      name,
      ageYear: randInt(20, 45),
      genderId: 1,
      usedCount: 0,
      maxUse: randInt(2, 5)
    }));

    function offenderNameVariant(name) {
      // ~20% chance of a slightly different spelling, mimicking real-world data entry inconsistency
      if (Math.random() < 0.2) {
        return name.replace(/a/i, (m) => (m === 'a' ? 'a' : 'A'));
      }
      return name;
    }

    const victimRows = [];
    const accusedRows = [];
    const complainantRows = [];
    const actSectionRows = [];
    const chargesheetRows = [];

    const firstNamesGeneric = [
      'Anita', 'Rajesh', 'Kavitha', 'Mohan', 'Geetha', 'Srikanth', 'Priya', 'Vijay',
      'Lakshmi', 'Kiran', 'Sunil', 'Roopa', 'Harish', 'Meena', 'Ashwin'
    ];

    caseRows.forEach(c => {
      const caseId = c.CaseMaster.ROWID;
      const statusId = String(c.CaseMaster.CaseStatusID);
      const unitId = c.CaseMaster.PoliceStationID;
      const crimeHeadId = c.CaseMaster.CrimeMajorHeadID;

      // Complainant (90% of cases)
      if (Math.random() < 0.9) {
        complainantRows.push({
          CaseMasterID: caseId,
          ComplainantName: `${randomFrom(firstNamesGeneric)} ${randomFrom(['Kumar', 'Reddy', 'Rao', 'Shetty', 'Gowda'])}`,
          AgeYear: randInt(19, 65),
          OccupationID: randomFrom(occupationRows).OccupationMaster.ROWID,
          ReligionID: randomFrom(religionRows).ReligionMaster.ROWID,
          CasteID: randomFrom(casteRows).CasteMaster.ROWID,
          GenderID: Math.random() < 0.6 ? 1 : 2
        });
      }

      // Victims (1-2)
      const victimCount = Math.random() < 0.7 ? 1 : 2;
      for (let v = 0; v < victimCount; v++) {
        victimRows.push({
          CaseMasterID: caseId,
          VictimName: `${randomFrom(firstNamesGeneric)} ${randomFrom(['Kumar', 'Reddy', 'Rao', 'Shetty', 'Gowda'])}`,
          AgeYear: randInt(5, 75),
          GenderID: Math.random() < 0.55 ? 2 : 1,
          VictimPolice: false
        });
      }

      // Accused (0-3, skip entirely if Undetected)
      let accusedCount = statusId === undetectedId ? 0 : randInt(0, 3);
      for (let a = 0; a < accusedCount; a++) {
        let name, age;
        // ~25% chance of pulling from the repeat-offender pool if it still has capacity
        const eligiblePool = offenderPool.filter(o => o.usedCount < o.maxUse);
        if (Math.random() < 0.25 && eligiblePool.length > 0) {
          const offender = randomFrom(eligiblePool);
          offender.usedCount++;
          name = offenderNameVariant(offender.name);
          age = offender.ageYear + randInt(-1, 1);
        } else {
          name = `${randomFrom(firstNamesGeneric)} ${randomFrom(['Kumar', 'Reddy', 'Rao', 'Shetty', 'Gowda'])}`;
          age = randInt(18, 50);
        }
        accusedRows.push({
          CaseMasterID: caseId,
          AccusedName: name,
          AgeYear: age,
          GenderID: 1,
          PersonID: `A${a + 1}`
        });
      }

      // Act/Section — pick up to 2 mappings matching this case's crime head
      const matches = mappingRows.filter(m => String(m.CrimeHeadActSection.CrimeHeadID) === String(crimeHeadId));
      const picks = matches.slice(0, randInt(1, Math.min(2, matches.length || 1)));
      picks.forEach((m, idx) => {
        actSectionRows.push({
          CaseMasterID: caseId,
          ActID: m.CrimeHeadActSection.ActCode,
          SectionID: m.CrimeHeadActSection.SectionCode,
          ActOrderID: idx + 1,
          SectionOrderID: idx + 1
        });
      });

      // Chargesheet — only for Charge Sheeted / Closed cases
      if (statusId === chargeSheetedId || statusId === closedId) {
        const unitEmployees = employeeRows.filter(e => String(e.Employee.UnitID) === String(unitId));
        const officer = unitEmployees.length > 0 ? randomFrom(unitEmployees).Employee.ROWID : randomFrom(employeeRows).Employee.ROWID;
        chargesheetRows.push({
          CaseMasterID: caseId,
          csdate: '2025-06-15 10:00:00',
          cstype: 'A',
          PolicePersonID: officer
        });
      }
    });

    async function batchInsert(tableName, rows) {
      if (rows.length === 0) return 0;
      const table = datastore.table(tableName);
      let total = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const inserted = await table.insertRows(rows.slice(i, i + 100));
        total += inserted.length;
      }
      return total;
    }

    const results = {
      ComplainantDetails: await batchInsert('ComplainantDetails', complainantRows),
      Victim: await batchInsert('Victim', victimRows),
      Accused: await batchInsert('Accused', accusedRows),
      ActSectionAssociation: await batchInsert('ActSectionAssociation', actSectionRows),
      ChargesheetDetails: await batchInsert('ChargesheetDetails', chargesheetRows)
    };

    res.status(200).json({ status: 'seeded', results });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/layer6', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const zcql = catalystApp.zcql();

    async function fetchAll(query, tableKey) {
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

    const accusedRows = await fetchAll("SELECT ROWID, CaseMasterID FROM Accused", "Accused");
    const caseRows = await fetchAll("SELECT ROWID, PoliceStationID, CourtID FROM CaseMaster", "CaseMaster");
    const unitRows = await zcql.executeZCQLQuery("SELECT ROWID, DistrictID, StateID FROM Unit LIMIT 300");
    const employeeRows = await zcql.executeZCQLQuery("SELECT ROWID, UnitID FROM Employee LIMIT 300");

    const caseById = {};
    caseRows.forEach(c => { caseById[c.CaseMaster.ROWID] = c.CaseMaster; });

    function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
    function randDateAfter(baseDaysAgo) {
      const d = new Date();
      d.setDate(d.getDate() - randInt(1, baseDaysAgo));
      return d.toISOString().split('T')[0];
    }

    const arrestRows = [];

    accusedRows.forEach(a => {
      // Only ~65% of accused have a recorded arrest/surrender event
      if (Math.random() > 0.65) return;

      const caseInfo = caseById[a.Accused.CaseMasterID];
      if (!caseInfo) return;

      const unit = unitRows.find(u => String(u.Unit.ROWID) === String(caseInfo.PoliceStationID));
      if (!unit) return;

      const unitEmployees = employeeRows.filter(e => String(e.Employee.UnitID) === String(unit.Unit.ROWID));
      const io = unitEmployees.length > 0 ? randomFrom(unitEmployees).Employee.ROWID : randomFrom(employeeRows).Employee.ROWID;

      arrestRows.push({
        CaseMasterID: a.Accused.CaseMasterID,
        ArrestSurrenderTypeID: Math.random() < 0.8 ? 1 : 2, // 1=Arrest, 2=Surrender
        ArrestSurrenderDate: randDateAfter(400),
        ArrestSurrenderStateId: unit.Unit.StateID,
        ArrestSurrenderDistrictId: unit.Unit.DistrictID,
        PoliceStationID: caseInfo.PoliceStationID,
        IOID: io,
        CourtID: caseInfo.CourtID,
        AccusedMasterID: a.Accused.ROWID,
        IsAccused: true,
        IsComplainantAccused: Math.random() < 0.05
      });
    });

    const table = datastore.table('ArrestSurrender');
    let totalInserted = 0;
    for (let i = 0; i < arrestRows.length; i += 100) {
      const inserted = await table.insertRows(arrestRows.slice(i, i + 100));
      totalInserted += inserted.length;
    }

    res.status(200).json({ status: 'seeded', results: [{ table: 'ArrestSurrender', count: totalInserted }] });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/seed-rag-credentials', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const segment = catalystApp.cache().segment('RagAuth');

    const { clientId, clientSecret, refreshToken } = req.body;
    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(400).json({ error: 'clientId, clientSecret, and refreshToken are all required' });
    }

    await segment.put('client_id', clientId, 48);
    await segment.put('client_secret', clientSecret, 48);
    await segment.put('refresh_token', refreshToken, 48);

    res.status(200).json({ status: 'credentials stored' });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/seed-station-mapping', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const zcql = catalystApp.zcql();

    const units = await zcql.executeZCQLQuery("SELECT ROWID, UnitName FROM Unit LIMIT 300");
    const firstUnit = units[0].Unit;

    const { stationOfficerEmail, scrbAnalystEmail } = req.body;
    if (!stationOfficerEmail || !scrbAnalystEmail) {
      return res.status(400).json({ error: 'stationOfficerEmail and scrbAnalystEmail are both required' });
    }

    const rows = [
      { Email: stationOfficerEmail, UnitID: firstUnit.ROWID, RoleName: 'STATION_OFFICER' },
      { Email: scrbAnalystEmail, UnitID: null, RoleName: 'SCRB_ANALYST' }
    ];
    const inserted = await datastore.table('UserStationMapping').insertRows(rows);

    res.status(200).json({ status: 'seeded', assignedUnit: firstUnit.UnitName, count: inserted.length });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});


module.exports = app;