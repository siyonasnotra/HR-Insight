import { useState, useEffect } from "react";
import { Target, Plus, Pencil, Trash2, CheckCircle2, XCircle, Loader2, Save, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AssessmentConfig = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, quesRes] = await Promise.all([
        supabase.from("assessment_categories").select("*").order('display_order').limit(6),
        supabase.from("questions").select(`
          *,
          assessment_categories (name)
        `).order('display_order')
      ]);

      if (catRes.error) throw catRes.error;
      if (quesRes.error) throw quesRes.error;

      setCategories(catRes.data);
      setQuestions(quesRes.data);
    } catch (err) {
      console.error("Error fetching config:", err);
      toast.error("Failed to load assessment configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const questionChannel = supabase
      .channel("questions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, () => {
        fetchData();
      })
      .subscribe();

    const categoryChannel = supabase
      .channel("categories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "assessment_categories" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(questionChannel);
      supabase.removeChannel(categoryChannel);
    };
  }, []);

  const handleToggleQuestionStatus = async (quesId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("questions")
        .update({ is_active: !currentStatus })
        .eq("id", quesId);

      if (error) throw error;
      toast.success("Question status updated");
      fetchData();
    } catch (err) {
      toast.error("Failed to update question");
    }
  };

  const handleEditQuestion = async (question: any) => {
    const newText = window.prompt("Edit question text:", question.question_text);
    if (!newText || newText.trim() === question.question_text) return;

    try {
      const { error } = await supabase
        .from("questions")
        .update({ question_text: newText.trim() })
        .eq("id", question.id);

      if (error) throw error;
      toast.success("Question updated successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to update question");
    }
  };

  const handleDeleteQuestion = async (quesId: string) => {
    if (!window.confirm("Are you sure you want to delete this question? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from("questions").delete().eq("id", quesId);
      if (error) throw error;
      toast.success("Question deleted successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete question. It might be in use.");
    }
  };

  const handleAddCategory = async () => {
    const name = window.prompt("New category name:");
    if (!name) return;

    const description = window.prompt("Category description (optional):", "");
    try {
      const maxOrder = categories.reduce((m, c) => Math.max(m, c.display_order || 0), 0);
      const { error } = await supabase.from("assessment_categories").insert([{ 
        name: name.trim(), 
        description: description?.trim() || null,
        display_order: maxOrder + 1,
      }]);

      if (error) throw error;
      toast.success("Category added successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add category");
    }
  };

  const handleEditCategory = async (category: any) => {
    const name = window.prompt("Edit category name:", category.name);
    if (!name || name.trim() === category.name) return;

    const description = window.prompt("Edit category description:", category.description || "");
    try {
      const { error } = await supabase
        .from("assessment_categories")
        .update({ name: name.trim(), description: description?.trim() || null })
        .eq("id", category.id);
      if (error) throw error;
      toast.success("Category updated successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Remove this category? Questions within this category will also be removed.")) return;

    try {
      const { error } = await supabase.from("assessment_categories").delete().eq("id", categoryId);
      if (error) throw error;
      toast.success("Category deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category. It may be in use.");
    }
  };

  const handleAddQuestion = async () => {
    if (categories.length === 0) {
      toast.error("Please add a category first.");
      return;
    }
    
    const text = window.prompt("Enter the question text:");
    if (!text) return;

    try {
      const { error } = await supabase.from("questions").insert([{
        category_id: categories[0].id, // Defaulting to first category for simplicity
        question_text: text,
        question_type: 'likert',
        weight: 1,
        max_score: 5,
        display_order: questions.length + 1,
        is_active: true
      }]);

      if (error) throw error;
      toast.success("Question added successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add question");
    }
  };

  return (
    <AppLayout title="Assessment Configuration">
      <div className="flex flex-col space-y-6">
        <Tabs defaultValue="categories" className="w-full">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories" className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Assessment Categories</h3>
                <p className="text-sm text-muted-foreground">Manage the main domains of HR maturity</p>
              </div>
              <Button className="gap-2" onClick={handleAddCategory}>
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>

            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading categories...
                      </TableCell>
                    </TableRow>
                  ) : categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-mono text-xs">{cat.display_order}</TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{cat.description}</TableCell>
                      <TableCell>{cat.weight}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategory(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Question Bank</h3>
                <p className="text-sm text-muted-foreground">Configure global assessment questions and scoring</p>
              </div>
              <Button className="gap-2" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>

            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading questions...
                      </TableCell>
                    </TableRow>
                  ) : questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Badge variant="outline">{q.assessment_categories?.name}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{q.question_text}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase font-mono">{q.question_type}</span>
                      </TableCell>
                      <TableCell>
                        {q.is_active ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleQuestionStatus(q.id, q.is_active)}
                          >
                            {q.is_active ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit Question" onClick={() => handleEditQuestion(q)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete Question"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AssessmentConfig;
