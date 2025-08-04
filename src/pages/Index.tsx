import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  ClipboardList, 
  BarChart3, 
  Calendar,
  CheckCircle,
  Clock,
  UserX,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    todayAttendance: {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpha: 0
    }
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total students
      const { data: students } = await (supabase as any)
        .from('students')
        .select('id')
        .eq('is_active', true);

      // Fetch total classes
      const { data: classes } = await (supabase as any)
        .from('classes')
        .select('id');

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance } = await (supabase as any)
        .from('attendance')
        .select('status')
        .eq('date', today);

      const attendanceStats = {
        hadir: attendance?.filter(a => a.status === 'Hadir').length || 0,
        sakit: attendance?.filter(a => a.status === 'Sakit').length || 0,
        izin: attendance?.filter(a => a.status === 'Izin').length || 0,
        alpha: attendance?.filter(a => a.status === 'Alpha').length || 0
      };

      setStats({
        totalStudents: students?.length || 0,
        totalClasses: classes?.length || 0,
        todayAttendance: attendanceStats
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-education-primary/10 to-education-secondary/10 rounded-lg p-6 border border-education-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-education-primary mb-2">
                Selamat Datang di Dashboard
              </h1>
              <p className="text-education-secondary">
                Pilih menu yang ingin Anda akses untuk mengelola absensi siswa dengan mudah dan efisien
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Input Absensi</CardTitle>
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">Form</div>
              <p className="text-xs text-blue-600 mt-1">Input absensi harian siswa</p>
            </CardContent>
          </Card>

          <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Rekap Absensi</CardTitle>
              <BarChart3 className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">Laporan</div>
              <p className="text-xs text-green-600 mt-1">Lihat rekap dan export data</p>
            </CardContent>
          </Card>

          <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Data Siswa</CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">Siswa</div>
              <p className="text-xs text-purple-600 mt-1">Kelola data siswa</p>
            </CardContent>
          </Card>

          <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Total Siswa</CardTitle>
              <Users className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">{stats.totalStudents}</div>
              <p className="text-xs text-orange-600 mt-1">Siswa aktif terdaftar</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Information Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-education-primary">Informasi Sistem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-semibold text-education-secondary mb-3">Fitur Utama:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Input absensi dengan auto-complete NIS
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Rekap bulanan dengan filter
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Export laporan ke Excel
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Manajemen data siswa
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Validasi duplikasi otomatis
                    </li>
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full text-education-primary border-education-primary/20 hover:bg-education-primary/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Lihat Detail Absensi Harian
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Attendance Status */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-education-primary">Status Kehadiran Hari Ini</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Hadir</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {stats.todayAttendance.hadir}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Sakit</span>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {stats.todayAttendance.sakit}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Izin</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {stats.todayAttendance.izin}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Alpha</span>
                  </div>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {stats.todayAttendance.alpha}
                  </Badge>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Total Kehadiran Hari Ini</div>
                  <div className="text-lg font-bold text-education-primary">
                    {Object.values(stats.todayAttendance).reduce((a, b) => a + b, 0)} siswa
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
