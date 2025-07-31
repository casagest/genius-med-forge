import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface RiskReport {
  id: string;
  title: string;
  description: string;
  riskScore: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  category: string;
  timestamp: string;
  actionRequired: boolean;
  aiConfidence: number;
  recommendations?: string[];
}

interface RiskReportCardProps {
  report: RiskReport;
  onActionClick?: (reportId: string) => void;
  onDismiss?: (reportId: string) => void;
}

export const RiskReportCard: React.FC<RiskReportCardProps> = ({
  report,
  onActionClick,
  onDismiss,
}) => {
  const getRiskColor = (score: number) => {
    if (score >= 0.8) return 'destructive';
    if (score >= 0.6) return 'secondary';
    return 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(report.status)}
            <CardTitle className="text-lg">{report.title}</CardTitle>
          </div>
          <Badge variant={getRiskColor(report.riskScore)}>
            {(report.riskScore * 100).toFixed(0)}%
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{report.category}</Badge>
          <span>•</span>
          <span>{formatTimestamp(report.timestamp)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{report.description}</p>

        {report.recommendations && report.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recomandări AI:</h4>
            <ul className="space-y-1">
              {report.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-primary">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            Încredere AI: {(report.aiConfidence * 100).toFixed(0)}%
          </div>
          
          <div className="flex gap-2">
            {report.actionRequired && report.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => onActionClick?.(report.id)}
                className="h-8"
              >
                Acționează
              </Button>
            )}
            {report.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDismiss?.(report.id)}
                className="h-8"
              >
                Respinge
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};