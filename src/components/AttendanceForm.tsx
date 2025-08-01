import { useState, useEffect } from "react";
import { Calendar, Save, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  student_id: string;
  name: string;
  classes: { name: string };
}

interface AttendanceRecord {
  student_id: string;
  status: string;
  notes?: string;
}

const statusOptions = [
  { value: "Hadir", label: "Hadir", color: "bg-green-500" },
  { value: "Izin", label: "Izin", color: "bg-yellow-500" },
  { value: "Sakit", label: "Sakit", color: "bg-blue-500" },
  { value: "Alpha", label: "Alpha", color: "bg-red-500" },
];

export function AttendanceForm() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('classes')
        .select('*')
        .order('grade_level', { ascending: true });
      
      if (error) {
        console.error('Error fetching classes:', error);
        toast({
          title: "Error",
          description: "Gagal memuat data kelas",
          variant: "destructive",
        });
      } else {
        setClasses(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('students')
        .select(`
          id,
          student_id,
          name,
          classes (name)
        `)
        .eq('class_id', selectedClass)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Error",
          description: "Gagal memuat data siswa",
          variant: "destructive",
        });
      } else {
        setStudents(data || []);
        // Initialize attendance with default "Hadir" status
        const initialAttendance: Record<string, AttendanceRecord> = {};
        (data || []).forEach((student: any) => {
          initialAttendance[student.id] = {
            student_id: student.id,
            status: "Hadir"
          };
        });
        setAttendance(initialAttendance);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const updateAttendance = (studentId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const saveAttendance = async () => {
    if (!selectedClass || students.length === 0) {
      toast({
        title: "Error",
        description: "Pilih kelas terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const attendanceRecords = Object.values(attendance).map(record => ({
        student_id: record.student_id,
        date: selectedDate,
        status: record.status,
        notes: record.notes,
        recorded_by: "Admin" // In real app, this would be the logged-in user
      }));

      const { error } = await (supabase as any)
        .from('attendance')
        .upsert(attendanceRecords, { 
          onConflict: 'student_id,date'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Berhasil",
        description: `Absensi untuk ${students.length} siswa telah disimpan`,
      });

    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data absensi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusSummary = () => {
    const summary = statusOptions.reduce((acc, option) => {
      acc[option.value] = Object.values(attendance).filter(a => a.status === option.value).length;
      return acc;
    }, {} as Record<string, number>);
    return summary;
  };

  const summary = getStatusSummary();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-school-blue/10 to-primary/10 border-b border-primary/20">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Form Absensi Harian
          </CardTitle>
          <CardDescription>
            Input data kehadiran siswa untuk pembelajaran hari ini
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 pr-3 py-2 w-full border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Kelas</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
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
                onClick={saveAttendance} 
                disabled={!selectedClass || students.length === 0 || loading}
                className="w-full bg-gradient-to-r from-school-blue to-primary hover:from-school-blue/90 hover:to-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Menyimpan..." : "Simpan Absensi"}
              </Button>
            </div>
          </div>

          {students.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {statusOptions.map(option => (
                  <div key={option.value} className="text-center">
                    <div className={`w-8 h-8 ${option.color} rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                      {summary[option.value] || 0}
                    </div>
                    <p className="text-sm font-medium">{option.label}</p>
                  </div>
                ))}
              </div>

              {/* Student List */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Daftar Siswa ({students.length})</h3>
                </div>
                
                {students.map(student => (
                  <Card key={student.id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{student.name}</h4>
                          <p className="text-sm text-muted-foreground">NIS: {student.student_id}</p>
                        </div>
                        <div className="flex gap-2">
                          {statusOptions.map(option => (
                            <Button
                              key={option.value}
                              variant={attendance[student.id]?.status === option.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateAttendance(student.id, option.value)}
                              className={
                                attendance[student.id]?.status === option.value
                                  ? `${option.color} text-white hover:${option.color}/90`
                                  : "hover:bg-muted"
                              }
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {selectedClass && students.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Tidak ada siswa aktif di kelas ini</p>
            </div>
          )}

          {!selectedClass && (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Pilih kelas untuk memulai input absensi</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}