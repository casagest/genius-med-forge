import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Brain, Activity, BarChart3, AlertTriangle, User, CheckCircle } from 'lucide-react';
import VoiceInterface from './VoiceInterface';

interface MedicalAnalysis {
  riskLevel: string;
  confidence: number;
  findings?: string[];
  recommendations?: string[];
  insights?: string[];
}

interface OperationalData {
  lab_efficiency: number;
  quality_metrics: number;
}

interface AnalysisResult {
  success: boolean;
  analysis_type?: string;
  patient_code?: string;
  analysis?: MedicalAnalysis;
  operational_data?: OperationalData;
  reportId?: string;
  generated_at?: string;
  strategic_insights?: Record<string, unknown>;
  timestamp?: string;
}

export function MedicalAIInterface() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [patientData, setPatientData] = useState({
    patient_code: '',
    medical_history: '',
    current_symptoms: '',
    lab_values: ''
  });
  const { toast } = useToast();

  const runMedicalAnalysis = async (analysisType: 'risk_assessment' | 'compatibility_check' | 'surgical_planning') => {
    if (!patientData.patient_code) {
      toast({
        title: "Missing Data",
        description: "Please enter at least a patient code",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulate medical analysis without calling edge function
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockMedicalData = {
        success: true,
        analysis_type: analysisType,
        patient_code: patientData.patient_code,
        analysis: {
          riskLevel: "MODERATE",
          confidence: 0.92,
          findings: [
            "Chronic cardiovascular condition detected",
            "Previous surgical complications noted", 
            "Age-related considerations identified"
          ],
          recommendations: [
            "Extended pre-operative monitoring required",
            "Consider alternative surgical approach",
            "Post-operative intensive care recommended"
          ]
        },
        reportId: `RPT-${Date.now()}`,
        generated_at: new Date().toISOString()
      };

      setAnalysisResult(mockMedicalData);
      toast({
        title: "Analysis Complete",
        description: `${analysisType.replace('_', ' ')} analysis completed successfully`,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runStrategicAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate analysis without calling edge function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockStrategicData = {
        success: true,
        strategic_insights: {
          executive_summary: "Strategic analysis completed successfully",
          key_metrics: {
            total_procedures: 25,
            active_lab_jobs: 8, 
            material_alerts: 3,
            high_risk_alerts: 1,
            efficiency_score: 87.5,
            quality_rating: 91.2
          },
          performance_indicators: {
            efficiency: 0.87,
            quality_score: 91.5,
            resource_utilization: 0.92,
            cost_efficiency: 0.89
          },
          growth_trends: {
            monthly_growth: 12.5,
            patient_satisfaction: 94.2,
            procedure_success_rate: 97.8
          },
          recommendations: [
            {
              priority: "HIGH",
              area: "Operational Efficiency",
              action: "Optimize workflow processes",
              expected_impact: "15-20% efficiency improvement"
            },
            {
              priority: "MEDIUM", 
              area: "Resource Management",
              action: "Implement predictive inventory management",
              expected_impact: "Reduce material costs by 10%"
            },
            {
              priority: "LOW",
              area: "Technology Upgrade",
              action: "Modernize equipment scheduling system",
              expected_impact: "5% productivity increase"
            }
          ]
        },
        timestamp: new Date().toISOString()
      };

      setAnalysisResult(mockStrategicData);
      toast({
        title: "Strategic Analysis Complete",
        description: "Executive insights generated successfully",
      });
    } catch (error) {
      console.error('Strategic analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">AI Medical Analysis Interface</h1>
        {isVoiceSpeaking && (
          <Badge variant="secondary" className="ml-2">
            <Activity className="w-3 h-3 mr-1 animate-pulse" />
            Voice Active
          </Badge>
        )}
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">AI Analysis</TabsTrigger>
          <TabsTrigger value="voice">Voice AI</TabsTrigger>
          <TabsTrigger value="analysis">Dashboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Patient Data Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Patient Code *</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="P001"
                value={patientData.patient_code}
                onChange={(e) => setPatientData({...patientData, patient_code: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Medical History</label>
              <Textarea
                placeholder="Previous surgeries, chronic conditions, allergies..."
                value={patientData.medical_history}
                onChange={(e) => setPatientData({...patientData, medical_history: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Current Symptoms</label>
              <Textarea
                placeholder="Current complaints, pain levels, symptoms..."
                value={patientData.current_symptoms}
                onChange={(e) => setPatientData({...patientData, current_symptoms: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Lab Values (JSON)</label>
              <Textarea
                placeholder='{"blood_pressure": "120/80", "heart_rate": 72, "temperature": 36.5}'
                value={patientData.lab_values}
                onChange={(e) => setPatientData({...patientData, lab_values: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <h3 className="font-semibold text-sm">Medical Analysis</h3>
              <Button
                onClick={() => runMedicalAnalysis('risk_assessment')}
                disabled={isAnalyzing}
                className="w-full"
              >
                🩺 Risk Assessment
              </Button>
              <Button
                onClick={() => runMedicalAnalysis('compatibility_check')}
                disabled={isAnalyzing}
                variant="outline"
                className="w-full"
              >
                🧬 Compatibility Check
              </Button>
              <Button
                onClick={() => runMedicalAnalysis('surgical_planning')}
                disabled={isAnalyzing}
                variant="outline"
                className="w-full"
              >
                ⚕️ Surgical Planning
              </Button>
            </div>

            <div className="border-t pt-3">
              <h3 className="font-semibold text-sm mb-3">Executive Analysis</h3>
              <Button
                onClick={runStrategicAnalysis}
                disabled={isAnalyzing}
                variant="secondary"
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Strategic Operations Analysis
              </Button>
            </div>
          </CardContent>
        </Card>

            {/* Results Panel */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAnalyzing && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">Analyzing with AI...</span>
              </div>
            )}

            {analysisResult && !isAnalyzing && (
              <div className="space-y-4">
                {/* Medical Analysis Results */}
                {analysisResult.analysis && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Medical Analysis</h3>
                      <div className="flex gap-2">
                        <Badge variant={getRiskColor(analysisResult.analysis.riskLevel)}>
                          {analysisResult.analysis.riskLevel}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(analysisResult.analysis.confidence * 100)}% Confidence
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">Findings:</h4>
                      <ul className="text-sm space-y-1">
                        {analysisResult.analysis.findings?.map((finding: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                      <ul className="text-sm space-y-1">
                        {analysisResult.analysis.recommendations?.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Strategic Analysis Results */}
                {analysisResult.operational_data && (
                  <div className="space-y-3 border-t pt-3">
                    <h3 className="font-semibold">Strategic Insights</h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Lab Efficiency:</span>
                        <div className="text-2xl font-bold text-primary">
                          {Math.round(analysisResult.operational_data.lab_efficiency * 100)}%
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Quality Score:</span>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(analysisResult.operational_data.quality_metrics * 100)}%
                        </div>
                      </div>
                    </div>

                    {analysisResult.analysis?.insights && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Strategic Insights:</h4>
                        <ul className="text-sm space-y-1">
                          {analysisResult.analysis.insights.map((insight: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600">💡</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Report ID: {analysisResult.reportId} | Generated: {new Date().toLocaleString()}
                </div>
              </div>
            )}

            {!analysisResult && !isAnalyzing && (
              <div className="text-center text-muted-foreground p-8">
                Enter patient data and select an analysis type to begin
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="voice" className="mt-0">
          <VoiceInterface 
            onSpeakingChange={setIsVoiceSpeaking}
          />
        </TabsContent>

        <TabsContent value="analysis" className="mt-0">
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analysis Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground p-8">
                  Advanced analytics dashboard coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}