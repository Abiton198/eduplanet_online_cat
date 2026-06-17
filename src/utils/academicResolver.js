// utils/academicResolver.js
import { callGroq } from './groqClient';

// Fetch Countries
export const fetchCountryCurriculumOptions = async (countryName) => {
    const prompt = `Return a JSON array of common academic curriculum types for ${countryName}. 
  Include types like "National Curriculum", "International Baccalaureate", "IGCSE", "State Board", etc.
  Format: ["Curriculum A", "Curriculum B"]`;

    const response = await callGroq(prompt);
    return JSON.parse(response);
};

// Fetch Provinces 
export const fetchProvinces = async (countryName) => {
    const prompt = `Return a JSON array of the states, provinces, or regions for ${countryName}. 
  Format: ["Province A", "Province B"]`;

    const response = await callGroq(prompt);
    const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
};

// Fetch Districts
export const fetchDistricts = async (country, province) => {
    const prompt = `Return a JSON array of the districts, municipalities, or local regions for the province of ${province}, ${country}. 
  Format: ["District A", "District B"]`;

    const response = await callGroq(prompt);
    const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
};


// Academic Levels
export const fetchLevels = async (country, curriculum) => {
    const prompt = `Return a JSON array of academic levels for the ${curriculum} system in ${country}. 
  Include everything from primary/secondary grades (e.g., "Grade 1") to tertiary levels (e.g., "1st Year University", "Diploma").
  Format: ["Level 1", "Level 2"]`;

    const response = await callGroq(prompt);
    const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
};

// Teaching Phases 
export const fetchTeachingPhases = async (country, curriculum) => {
    const prompt = `Return a JSON array of teaching specializations or phases for the ${curriculum} system in ${country}. 
  Include options like "Primary", "Secondary", "Higher Education/University", "Vocational", "Tutor".
  Format: ["Phase A", "Phase B"]`;

    const response = await callGroq(prompt);
    const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
};

//Subjects
export const fetchSubjects = async (country, curriculum, phase) => {
    const prompt = `Return a JSON array of standard subjects for the ${curriculum} system in ${country} 
  for the ${phase} academic level. 
  Format: ["Subject A", "Subject B", "Subject C"]`;

    const response = await callGroq(prompt);
    const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
};