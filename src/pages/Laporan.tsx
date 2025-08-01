import { useState, useEffect } from "react";
import { BarChart3, Calendar, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";

interface AttendanceReport {
  student_id: string;
  student_name: string;
  student_nis: string;
  class_name: string;
  total_days: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  percentage: number;
}

const Laporan = () => {
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      generateReport();
    }
  }, [selectedClass, selectedMonth, selectedYear, classes]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('classes')
        .select('*')
        .order('grade_level', { ascending: true });
      
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Get the first and last day of the selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      // Build query for students
      let studentsQuery = (supabase as any)
        .from('students')
        .select(`
          id,
          student_id,
          name,
          class_id,
          classes (name)
        `)
        .eq('is_active', true);

      if (selectedClass !== "all") {
        studentsQuery = studentsQuery.eq('class_id', selectedClass);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Get attendance data for the period
      const { data: attendanceData, error: attendanceError } = await (supabase as any)
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError) throw attendanceError;

      // Calculate working days in the month (excluding weekends for now)
      const workingDays = getWorkingDaysInMonth(selectedYear, selectedMonth - 1);

      // Process the data
      const reportData: AttendanceReport[] = students.map((student: any) => {
        const studentAttendance = attendanceData.filter((att: any) => att.student_id === student.id);
        
        const statusCounts = {
          hadir: studentAttendance.filter((att: any) => att.status === 'Hadir').length,
          izin: studentAttendance.filter((att: any) => att.status === 'Izin').length,
          sakit: studentAttendance.filter((att: any) => att.status === 'Sakit').length,
          alpha: studentAttendance.filter((att: any) => att.status === 'Alpha').length,
        };

        const totalRecorded = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        const percentage = workingDays > 0 ? Math.round((statusCounts.hadir / workingDays) * 100) : 0;

        return {
          student_id: student.id,
          student_name: student.name,
          student_nis: student.student_id,
          class_name: student.classes?.name || 'Unknown',
          total_days: workingDays,
          ...statusCounts,
          percentage
        };
      });

      setReports(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Gagal membuat laporan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWorkingDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 80) return "bg-yellow-500";
    if (percentage >= 70) return "bg-orange-500";
    return "bg-red-500";
  };

  const exportReport = () => {
    toast({
      title: "Fitur Export",
      description: "Fitur export Excel akan segera tersedia",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-school-yellow/10 to-accent/10 border-b border-accent/20">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-accent" />
              Laporan Absensi Bulanan
            </CardTitle>
            <CardDescription>
              Rekap kehadiran siswa SMPN 3 KEBAKKRAMAT per bulan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Bulan</label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2024, i).toLocaleDateString('id-ID', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tahun</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Kelas</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={exportReport}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {reports.reduce((sum, r) => sum + r.hadir, 0)}
                  </div>
                  <p className="text-sm text-green-600">Total Hadir</p>
                </CardContent>
              </Card>
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">
                    {reports.reduce((sum, r) => sum + r.izin, 0)}
                  </div>
                  <p className="text-sm text-yellow-600">Total Izin</p>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {reports.reduce((sum, r) => sum + r.sakit, 0)}
                  </div>
                  <p className="text-sm text-blue-600">Total Sakit</p>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {reports.reduce((sum, r) => sum + r.alpha, 0)}
                  </div>
                  <p className="text-sm text-red-600">Total Alpha</p>
                </CardContent>
              </Card>
            </div>

            {/* Reports Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Detail Laporan ({reports.length} siswa)
                </h3>
                {loading && (
                  <div className="text-sm text-muted-foreground">Memuat data...</div>
                )}
              </div>
              
              <div className="space-y-3">
                {reports.map(report => (
                  <Card key={report.student_id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{report.student_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>NIS: {report.student_nis}</span>
                            <Badge variant="outline">{report.class_name}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(report.percentage)}`}>
                            {report.percentage}% Kehadiran
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Hari Kerja:</span>
                          <div className="font-medium">{report.total_days}</div>
                        </div>
                        <div>
                          <span className="text-green-600">Hadir:</span>
                          <div className="font-medium text-green-700">{report.hadir}</div>
                        </div>
                        <div>
                          <span className="text-yellow-600">Izin:</span>
                          <div className="font-medium text-yellow-700">{report.izin}</div>
                        </div>
                        <div>
                          <span className="text-blue-600">Sakit:</span>
                          <div className="font-medium text-blue-700">{report.sakit}</div>
                        </div>
                        <div>
                          <span className="text-red-600">Alpha:</span>
                          <div className="font-medium text-red-700">{report.alpha}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tidak Hadir:</span>
                          <div className="font-medium">{report.izin + report.sakit + report.alpha}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {reports.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada data absensi untuk periode ini</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Laporan;