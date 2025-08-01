import { useState, useEffect } from "react";
import { Users, Plus, Upload, Edit, Trash2, Search } from "lucide-react";
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

interface Student {
  id: string;
  student_id: string;
  name: string;
  class_id: string;
  gender: string;
  phone: string;
  address: string;
  parent_name: string;
  parent_phone: string;
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
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    class_id: "",
    gender: "",
    phone: "",
    address: "",
    parent_name: "",
    parent_phone: ""
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
        gender: "",
        phone: "",
        address: "",
        parent_name: "",
        parent_phone: ""
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
      gender: student.gender,
      phone: student.phone || "",
      address: student.address || "",
      parent_name: student.parent_name || "",
      parent_phone: student.parent_phone || ""
    });
    setIsAddDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-school-orange/10 to-secondary/10 border-b border-secondary/20">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-secondary" />
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
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    toast({
                      title: "Fitur Import Excel",
                      description: "Fitur ini akan segera tersedia",
                    });
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Import Excel
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-school-orange to-secondary hover:from-school-orange/90 hover:to-secondary/90">
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
                      <div>
                        <Label htmlFor="phone">No. HP Siswa</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="Nomor HP siswa"
                        />
                      </div>
                      <div>
                        <Label htmlFor="parent_name">Nama Orang Tua</Label>
                        <Input
                          id="parent_name"
                          value={formData.parent_name}
                          onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                          placeholder="Nama orang tua/wali"
                        />
                      </div>
                      <div>
                        <Label htmlFor="parent_phone">No. HP Orang Tua</Label>
                        <Input
                          id="parent_phone"
                          value={formData.parent_phone}
                          onChange={(e) => setFormData({...formData, parent_phone: e.target.value})}
                          placeholder="Nomor HP orang tua"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="address">Alamat</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          placeholder="Alamat lengkap siswa"
                          className="resize-none"
                        />
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>NIS:</strong> {student.student_id}</p>
                            <p><strong>HP:</strong> {student.phone || "Tidak ada"}</p>
                            <p><strong>Orang Tua:</strong> {student.parent_name || "Tidak ada"}</p>
                            <p><strong>HP Orang Tua:</strong> {student.parent_phone || "Tidak ada"}</p>
                            {student.address && (
                              <p className="md:col-span-2"><strong>Alamat:</strong> {student.address}</p>
                            )}
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