import { useState, useEffect, useRef } from "react";
import { Users, Plus, Upload, Edit, Trash2, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  student_id: string;
  name: string;
  class_id: string;
  gender: string;
  is_active: boolean;
  classes?: { name: string };
}

const DataSiswa = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    class_id: "",
    gender: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

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

  const fetchStudents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('students')
        .select(`
          *,
          classes (name)
        `)
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data siswa",
        variant: "destructive",
      });
    }
  };

  const handleSaveStudent = async () => {
    try {
      if (editingStudent) {
        const { error } = await (supabase as any)
          .from('students')
          .update(formData)
          .eq('id', editingStudent.id);
        
        if (error) throw error;
        toast({ title: "Berhasil", description: "Data siswa berhasil diupdate" });
      } else {
        const { error } = await (supabase as any)
          .from('students')
          .insert([formData]);
        
        if (error) throw error;
        toast({ title: "Berhasil", description: "Siswa baru berhasil ditambahkan" });
      }
      
      setIsAddDialogOpen(false);
      setEditingStudent(null);
      setFormData({
        student_id: "",
        name: "",
        class_id: "",
        gender: ""
      });
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data siswa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('students')
        .update({ is_active: false })
        .eq('id', studentId);
      
      if (error) throw error;
      toast({ title: "Berhasil", description: "Siswa berhasil dinonaktifkan" });
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus siswa",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "all" || student.class_id === selectedClass;
    return matchesSearch && matchesClass && student.is_active;
  });

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      class_id: student.class_id,
      gender: student.gender
    });
    setIsAddDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Format File Tidak Valid",
        description: "File harus berformat Excel (.xlsx atau .xls)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Terlalu Besar",
        description: "Ukuran file maksimal 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      if (!workbook.SheetNames.length) {
        throw new Error("File Excel tidak memiliki sheet");
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        toast({
          title: "Data Kosong",
          description: "File Excel tidak memiliki data atau hanya berisi header",
          variant: "destructive",
        });
        return;
      }

      // Validate header format
      const headers = jsonData[0] as string[];
      const expectedHeaders = ['NIS', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin'];
      const headerValid = expectedHeaders.every((header, index) => 
        headers[index]?.toString().toLowerCase().includes(header.toLowerCase().split(' ')[0])
      );

      if (!headerValid) {
        toast({
          title: "Format Header Salah",
          description: `Header harus: ${expectedHeaders.join(', ')}. Download template untuk format yang benar.`,
          variant: "destructive",
        });
        return;
      }

      // Process data rows
      const rows = jsonData.slice(1) as any[][];
      const studentsToImport = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      let processedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        
        // Skip completely empty rows
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
          continue;
        }

        const [nis, name, className, gender] = row.map(cell => 
          cell ? cell.toString().trim() : ''
        );
        
        // Validate required fields
        if (!nis) {
          errors.push(`Baris ${rowNumber}: NIS tidak boleh kosong`);
          continue;
        }
        if (!name) {
          errors.push(`Baris ${rowNumber}: Nama tidak boleh kosong`);
          continue;
        }
        if (!className) {
          errors.push(`Baris ${rowNumber}: Kelas tidak boleh kosong`);
          continue;
        }
        if (!gender) {
          errors.push(`Baris ${rowNumber}: Jenis Kelamin tidak boleh kosong`);
          continue;
        }

        // Validate NIS format (should be numeric)
        if (!/^\d+$/.test(nis)) {
          errors.push(`Baris ${rowNumber}: NIS harus berupa angka`);
          continue;
        }

        // Validate gender
        const validGenders = ['laki-laki', 'perempuan', 'l', 'p'];
        const normalizedGender = gender.toLowerCase();
        if (!validGenders.includes(normalizedGender)) {
          errors.push(`Baris ${rowNumber}: Jenis Kelamin harus 'Laki-laki' atau 'Perempuan'`);
          continue;
        }

        // Normalize gender
        const finalGender = normalizedGender === 'l' || normalizedGender === 'laki-laki' ? 'Laki-laki' : 'Perempuan';

        // Find class by name (case insensitive)
        const classData = classes.find(c => 
          c.name.toLowerCase().replace(/\s+/g, '') === className.toLowerCase().replace(/\s+/g, '')
        );
        if (!classData) {
          errors.push(`Baris ${rowNumber}: Kelas "${className}" tidak ditemukan. Pastikan kelas sudah terdaftar di sistem.`);
          continue;
        }

        // Check if student already exists
        const existingStudent = students.find(s => s.student_id === nis);
        if (existingStudent) {
          if (existingStudent.is_active) {
            warnings.push(`Baris ${rowNumber}: Siswa dengan NIS "${nis}" sudah aktif`);
            continue;
          } else {
            // Reactivate inactive student
            warnings.push(`Baris ${rowNumber}: Siswa dengan NIS "${nis}" akan diaktifkan kembali`);
          }
        }

        // Validate name length
        if (name.length < 2) {
          errors.push(`Baris ${rowNumber}: Nama terlalu pendek (minimal 2 karakter)`);
          continue;
        }
        if (name.length > 100) {
          errors.push(`Baris ${rowNumber}: Nama terlalu panjang (maksimal 100 karakter)`);
          continue;
        }

        studentsToImport.push({
          student_id: nis,
          name: name,
          class_id: classData.id,
          gender: finalGender,
          is_active: true
        });
        processedCount++;
      }

      // Show detailed feedback
      if (errors.length > 0) {
        const errorMessage = errors.slice(0, 5).join('\n') + 
          (errors.length > 5 ? `\n... dan ${errors.length - 5} error lainnya` : '');
        
        toast({
          title: `${errors.length} Baris Gagal Diimport`,
          description: errorMessage,
          variant: "destructive",
        });
        
        console.log("Import errors:", errors);
      }

      if (warnings.length > 0) {
        console.log("Import warnings:", warnings);
      }

      if (studentsToImport.length === 0) {
        toast({
          title: "Tidak Ada Data Valid",
          description: "Tidak ada data siswa yang valid untuk diimport",
          variant: "destructive",
        });
        return;
      }

      // Import valid students
      const { error } = await (supabase as any)
        .from('students')
        .upsert(studentsToImport, { 
          onConflict: 'student_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      const successMessage = `${studentsToImport.length} siswa berhasil diimport` +
        (warnings.length > 0 ? ` (${warnings.length} peringatan)` : '') +
        (errors.length > 0 ? `. ${errors.length} baris diabaikan karena error.` : '');

      toast({
        title: "Import Berhasil!",
        description: successMessage,
      });

      fetchStudents();

    } catch (error) {
      console.error('Error importing Excel file:', error);
      toast({
        title: "Gagal Import File",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengimport file Excel",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['NIS', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin'],
      ['12345', 'John Doe', '7A', 'Laki-laki'],
      ['12346', 'Jane Smith', '7B', 'Perempuan'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Data Siswa");
    XLSX.writeFile(wb, "template_data_siswa.xlsx");

    toast({
      title: "Template Downloaded",
      description: "Template Excel berhasil didownload",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-education-primary/10 to-education-secondary/10 border-b border-education-secondary/20">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-education-secondary" />
              Manajemen Data Siswa
            </CardTitle>
            <CardDescription>
              Kelola data siswa SMPN 3 KEBAKKRAMAT dengan fitur lengkap
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau NIS siswa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Semua kelas" />
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
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls"
                  className="hidden"
                  aria-label="Upload Excel file for student data import"
                  title="Upload Excel file (.xlsx or .xls) containing student data"
                />
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload className="h-4 w-4" />
                  {isImporting ? "Mengimport..." : "Import Excel"}
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-education-primary/20 text-education-primary hover:bg-education-primary/10"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4" />
                  Template
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-education-primary to-education-secondary hover:from-education-primary/90 hover:to-education-secondary/90 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Siswa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingStudent ? "Edit Data Siswa" : "Tambah Siswa Baru"}
                      </DialogTitle>
                      <DialogDescription>
                        Lengkapi formulir di bawah ini untuk {editingStudent ? "mengupdate" : "menambahkan"} data siswa
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="student_id">NIS</Label>
                        <Input
                          id="student_id"
                          value={formData.student_id}
                          onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                          placeholder="Nomor Induk Siswa"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Nama lengkap siswa"
                        />
                      </div>
                      <div>
                        <Label htmlFor="class_id">Kelas</Label>
                        <Select value={formData.class_id} onValueChange={(value) => setFormData({...formData, class_id: value})}>
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
                      <div>
                        <Label htmlFor="gender">Jenis Kelamin</Label>
                        <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis kelamin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setEditingStudent(null);
                        }}
                      >
                        Batal
                      </Button>
                      <Button onClick={handleSaveStudent}>
                        {editingStudent ? "Update" : "Simpan"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Students Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Daftar Siswa ({filteredStudents.length})
                </h3>
              </div>
              
              <div className="grid gap-4">
                {filteredStudents.map(student => (
                  <Card key={student.id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{student.name}</h4>
                            <Badge variant="secondary">
                              {student.classes?.name || "Kelas tidak ditemukan"}
                            </Badge>
                            <Badge variant={student.gender === "Laki-laki" ? "default" : "outline"}>
                              {student.gender}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p><strong>NIS:</strong> {student.student_id}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(student)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredStudents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Tidak ada siswa yang ditemukan</p>
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

export default DataSiswa;