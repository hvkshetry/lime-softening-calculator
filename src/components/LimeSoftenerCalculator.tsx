'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define all interfaces
interface InputState {
  flowRate: number;
  totalHardness: number;
  calciumHardness: number;
  alkalinity: number;
  silica: number;
  temperature: number;
  pH: number;
  targetHardness: number;
  excessLime: number;
  magnesiumDoseForSilica: number;
}

interface ResultsState {
  limeDosage: number;
  sodaAshDosage: number;
  calciumSludge: number;
  magnesiumSludge: number;
  totalSludge: number;
  finalHardness: number;
  silicaRemoval: number;
  finalSilica: number;
  magnesiumHydroxideDose: number;
  pHAfterLime: number;
  controlRegime: string;
}

interface HardnessTypes {
  caCarbHardness: number;
  mgCarbHardness: number;
  caNonCarbHardness: number;
  mgNonCarbHardness: number;
}

interface DataPoint {
  pH: number;
  temp0?: number;
  temp25?: number;
  temp50?: number;
  [key: string]: number | undefined;
}

interface LeakagePoint {
  carbonate: number;
  coldWater: number;
  hotWater: number;
}

const LimeSoftenerCalculator: React.FC = () => {
  // Initialize state with proper types
  const [inputs, setInputs] = useState<InputState>({
    flowRate: 1000,
    totalHardness: 150,
    calciumHardness: 100,
    alkalinity: 120,
    silica: 40,
    temperature: 25,
    pH: 7.5,
    targetHardness: 40,
    excessLime: 35,
    magnesiumDoseForSilica: 0,
  });

  const [results, setResults] = useState<ResultsState>({
    limeDosage: 0,
    sodaAshDosage: 0,
    calciumSludge: 0,
    magnesiumSludge: 0,
    totalSludge: 0,
    finalHardness: 0,
    silicaRemoval: 0,
    finalSilica: 0,
    magnesiumHydroxideDose: 0,
    pHAfterLime: 0,
    controlRegime: 'Stoichiometric'
  });

  const [leakageData, setLeakageData] = useState<LeakagePoint[]>([]);
  const [mgSolubilityData, setMgSolubilityData] = useState<DataPoint[]>([]);
  // Event handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  // Constants
  const MIN_PH_SILICA = 9.5;
  const MAX_SILICA_REMOVAL = 0.9;

  // Calculate pK for Mg(OH)2
  const calculateMgOHpK = (tempC: number): number => {
    return 10.0 + (tempC/60);
  };

  // Calculate residual Mg
  const calculateResidualMg = (pH: number, tempC: number): number => {
    const pK = calculateMgOHpK(tempC);
    const solubilityProduct = Math.pow(10, -pK);
    const OH = Math.pow(10, pH - 14);
    const residualMg = (solubilityProduct / Math.pow(OH, 2)) * 50;
    return Math.min(100, residualMg);
  };

  // Calculate different hardness types
  const calculateHardnessTypes = (input: InputState): HardnessTypes => {
    const magHardness = input.totalHardness - input.calciumHardness;
    let caCarbHardness: number,
        mgCarbHardness: number,
        caNonCarbHardness: number,
        mgNonCarbHardness: number;

    if (input.calciumHardness > input.alkalinity) {
      caCarbHardness = input.alkalinity;
      mgCarbHardness = 0;
      caNonCarbHardness = input.calciumHardness - input.alkalinity;
      mgNonCarbHardness = magHardness;
    } else {
      caCarbHardness = input.calciumHardness;
      caNonCarbHardness = 0;
      if (input.totalHardness > input.alkalinity) {
        mgCarbHardness = input.alkalinity - input.calciumHardness;
        mgNonCarbHardness = input.totalHardness - input.alkalinity;
      } else {
        mgCarbHardness = magHardness;
        mgNonCarbHardness = 0;
      }
    }

    return {
      caCarbHardness,
      mgCarbHardness,
      caNonCarbHardness,
      mgNonCarbHardness,
    };
  };

  // Calculate CO2
  const calculateCO2 = (pH: number, alkalinity: number): number => {
    const K1 = 4.02e-7;
    return ((Math.pow(10, -pH) * alkalinity) / K1) * 2;
  };

  // Calculate lime dosage
  const calculateLimeDosage = (hardnessTypes: HardnessTypes, CO2: number): { limeDosage: number; controlRegime: string } => {
    // Calculate stoichiometric lime demand
    const stoichLimeDosage = (
      // CO2 neutralization
      CO2/22 +
      // All calcium hardness (both carbonate and non-carbonate, since soda ash converts non-carbonate to carbonate)
      (inputs.calciumHardness - inputs.targetHardness)/50 +
      // All magnesium hardness (requires 2 OH- per Mg2+)
      2 * ((inputs.totalHardness - inputs.calciumHardness)/50) +
      // Extra lime for silica removal
      2 * (inputs.magnesiumDoseForSilica/50) +
      // Excess lime
      inputs.excessLime/50
    );

    // Calculate pH-based lime demand
    const targetPH = 10.5;
    const pHAdjustLimeDosage = (
      CO2/22 +
      inputs.alkalinity/50 * (1 - Math.pow(10, inputs.pH - 10.3)) +
      Math.pow(10, -(14-targetPH)) - Math.pow(10, -inputs.pH)
    );

    return {
      limeDosage: Math.max(stoichLimeDosage, pHAdjustLimeDosage),
      controlRegime: stoichLimeDosage > pHAdjustLimeDosage ? 'Stoichiometric' : 'pH'
    };
  };

  // Calculate results
  const calculateResults = (): void => {
    try {
      const hardnessTypes = calculateHardnessTypes(inputs);
      const CO2 = calculateCO2(inputs.pH, inputs.alkalinity/50);
      
      const { limeDosage, controlRegime } = calculateLimeDosage(hardnessTypes, CO2);

      const magnesiumHydroxide = ((inputs.totalHardness - inputs.calciumHardness) + 
        inputs.magnesiumDoseForSilica) * (74/100);

      const silicaRemoved = Math.min(
        inputs.silica * MAX_SILICA_REMOVAL,
        (magnesiumHydroxide/7)
      );

      const calciumSludge = (hardnessTypes.caCarbHardness/50 + 
        hardnessTypes.caNonCarbHardness/50 - inputs.targetHardness/50) * 
        50 * inputs.flowRate/1000;

      const magnesiumSludge = (hardnessTypes.mgCarbHardness/50 + 
        hardnessTypes.mgNonCarbHardness/50 - inputs.targetHardness/50) * 
        29.2 * inputs.flowRate/1000;

      setResults({
        limeDosage: limeDosage * 37,
        // Soda ash needed only for non-carbonate hardness
        sodaAshDosage: Math.max(0, (
          (hardnessTypes.caNonCarbHardness + hardnessTypes.mgNonCarbHardness) / 50
        ) * 53), // Using equivalent weight of Na2CO3 for conversion
        calciumSludge,
        magnesiumSludge,
        totalSludge: calciumSludge + magnesiumSludge,
        finalHardness: inputs.targetHardness,
        silicaRemoval: silicaRemoved,
        finalSilica: Math.max(0, inputs.silica - silicaRemoved),
        magnesiumHydroxideDose: magnesiumHydroxide,
        pHAfterLime: 10.5,
        controlRegime
      });
    } catch (error) {
      console.error('Error in calculations:', error);
    }
  };
// Effect for calculating results when inputs change
  useEffect(() => {
    calculateResults();
  }, [inputs]);

  // Effect for generating Mg solubility data
  useEffect(() => {
    const data: DataPoint[] = [];
    const temperatures = [0, 25, 50];
    
    for (let pH = 9; pH <= 11; pH += 0.1) {
      const point: DataPoint = { pH };
      temperatures.forEach(temp => {
        const key = `temp${temp}` as keyof DataPoint;
        point[key] = calculateResidualMg(pH, temp);
      });
      data.push(point);
    }
    setMgSolubilityData(data);
  }, []);

  // Effect for generating Ca leakage data
  useEffect(() => {
    const data: LeakagePoint[] = [];
    for (let carbonate = 0; carbonate <= 100; carbonate += 5) {
      const caColdWater = 100 * Math.exp(-0.025 * carbonate);
      const caHotWater = 80 * Math.exp(-0.02 * carbonate);
      
      data.push({
        carbonate,
        coldWater: caColdWater,
        hotWater: caHotWater,
      });
    }
    setLeakageData(data);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lime Softening Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Input Parameters</h3>
              
              <div>
                <Label htmlFor="flowRate">Flow Rate (m³/day)</Label>
                <Input
                  id="flowRate"
                  name="flowRate"
                  type="number"
                  value={inputs.flowRate}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="totalHardness">Total Hardness (mg/L as CaCO₃)</Label>
                <Input
                  id="totalHardness"
                  name="totalHardness"
                  type="number"
                  value={inputs.totalHardness}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="calciumHardness">Calcium Hardness (mg/L as CaCO₃)</Label>
                <Input
                  id="calciumHardness"
                  name="calciumHardness"
                  type="number"
                  value={inputs.calciumHardness}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="alkalinity">Alkalinity (mg/L as CaCO₃)</Label>
                <Input
                  id="alkalinity"
                  name="alkalinity"
                  type="number"
                  value={inputs.alkalinity}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  value={inputs.temperature}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="pH">pH</Label>
                <Input
                  id="pH"
                  name="pH"
                  type="number"
                  step="0.1"
                  value={inputs.pH}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="silica">Silica (mg/L as SiO₂)</Label>
                <Input
                  id="silica"
                  name="silica"
                  type="number"
                  value={inputs.silica}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="targetHardness">Target Hardness (mg/L as CaCO₃)</Label>
                <Input
                  id="targetHardness"
                  name="targetHardness"
                  type="number"
                  value={inputs.targetHardness}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Results</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lime Dosage</Label>
                  <p className="text-lg">{results.limeDosage.toFixed(1)} mg/L Ca(OH)₂</p>
                  <p className="text-sm text-gray-600">Control: {results.controlRegime}</p>
                </div>
                
                <div>
                  <Label>Soda Ash Dosage</Label>
                  <p className="text-lg">{results.sodaAshDosage.toFixed(1)} mg/L Na₂CO₃</p>
                </div>
                
                <div>
                  <Label>Calcium Sludge</Label>
                  <p className="text-lg">{results.calciumSludge.toFixed(1)} kg/day</p>
                </div>
                
                <div>
                  <Label>Magnesium Sludge</Label>
                  <p className="text-lg">{results.magnesiumSludge.toFixed(1)} kg/day</p>
                </div>
                
                <div>
                  <Label>Total Sludge Production</Label>
                  <p className="text-lg">{results.totalSludge.toFixed(1)} kg/day</p>
                </div>
                
                <div>
                  <Label>Final Hardness</Label>
                  <p className="text-lg">{results.finalHardness.toFixed(1)} mg/L as CaCO₃</p>
                </div>

                <div>
                  <Label>Silica Removal</Label>
                  <p className="text-lg">{results.silicaRemoval.toFixed(1)} mg/L as SiO₂</p>
                </div>

                <div>
                  <Label>Final Silica</Label>
                  <p className="text-lg">{results.finalSilica.toFixed(1)} mg/L as SiO₂</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visualizations */}
          <div className="mt-8 space-y-6">
            <h3 className="font-semibold">Process Operating Points</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Calcium Carbonate Solubility vs Temperature</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={leakageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="carbonate" 
                        label={{ value: 'Carbonate (mg/L as CaCO₃)', position: 'bottom' }}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Calcium (mg/L as CaCO₃)', 
                          angle: -90, 
                          position: 'insideLeft' 
                        }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="coldWater" 
                        name="Cold Water (10-20°C)"
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="hotWater" 
                        name="Hot Water (105°C)"
                        stroke="#82ca9d" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Magnesium Solubility vs pH and Temperature</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mgSolubilityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="pH" 
                        domain={[9, 11]}
                        label={{ value: 'pH', position: 'bottom' }}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Residual Mg (mg/L as CaCO₃)', 
                          angle: -90, 
                          position: 'insideLeft' 
                        }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="temp0" 
                        name="0°C"
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="temp25" 
                        name="25°C"
                        stroke="#82ca9d" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="temp50" 
                        name="50°C"
                        stroke="#ff7300" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LimeSoftenerCalculator;
