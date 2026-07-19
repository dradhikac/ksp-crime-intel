'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();

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

module.exports = app;