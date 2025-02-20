import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconByName, exerciseIcons, ExerciseIcon } from '../lib/exercise-icons';
import { PlusIcon, MagnifyingGlassIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Database } from '../types/supabase';

type Category = Database['public']['Tables']['exercise_categories']['Row'];
// We assume the exercise_templates table already contains these fields:
// id, name, default_sets, default_reps, default_distance, icon_name, is_custom, etc.
type ExerciseTemplate = Database['public']['Tables']['exercise_templates']['Row'] & {
  category_id: string | null | undefined;
  deleted_category_name?: string | null;
};

// For ease of use in form state we define an explicit type.
type NewExerciseType = {
  name: string;
  category_id: string | null | undefined;
  default_sets: number | null;
  default_reps: number | null;
  default_distance: number | null;
  default_duration: number | null; // <-- added duration field
  icon_name: string;
  deleted_category_name: string | null;
};

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseTemplate) => void;
  onClose: () => void;
}

export default function ExerciseSelector({ onSelect, onClose }: ExerciseSelectorProps) {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null | undefined>(undefined);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<ExerciseIcon>(exerciseIcons[0]);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const newExerciseFormRef = useRef<HTMLDivElement>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingExercise, setEditingExercise] = useState<ExerciseTemplate | null>(null);
  const [error, setError] = useState('');
  const [newExercise, setNewExercise] = useState<NewExerciseType>({
    name: '',
    category_id: undefined,
    default_sets: null,
    default_reps: null,
    default_distance: null,
    default_duration: null, // <-- added default
    icon_name: exerciseIcons[0].name,
    deleted_category_name: null
  });

  useEffect(() => {
    fetchCategories();
    fetchExercises();
  }, []);

  useEffect(() => {
    if (showNewExerciseForm && newExerciseFormRef.current) {
      newExerciseFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showNewExerciseForm]);

  const filteredIcons = exerciseIcons;

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('exercise_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    if (data) {
      setCategories(data);
    }
  }

  async function fetchExercises() {
    const { data, error } = await supabase
      .from('exercise_templates')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching exercises:', error);
      return;
    }
    if (data) {
      setExercises(data);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm('Are you sure you want to delete this category? Exercises in this category will be assigned to "Uncategorized".')) {
      return;
    }

    try {
      const categoryToDelete = categories.find(c => c.id === categoryId);
      if (!categoryToDelete) return;

      // Find the default "Uncategorized" category
      const uncategorizedCategory = categories.find(
        c => c.is_default && c.name === 'Uncategorized'
      );
      if (!uncategorizedCategory) {
        setError('No "Uncategorized" category found. Please create one.');
        return;
      }

      // Update all exercises in this category to point to "Uncategorized"
      const { error: updateError } = await supabase
        .from('exercise_templates')
        .update({
          category_id: uncategorizedCategory.id,
          deleted_category_name: `(Previously in ${categoryToDelete.name})`
        })
        .eq('category_id', categoryId);

      if (updateError) throw updateError;

      // Then delete the category
      const { error: deleteError } = await supabase
        .from('exercise_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;

      // Update local state
      setCategories(categories.filter(c => c.id !== categoryId));
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }

      // Fetch updated exercises list
      await fetchExercises();

    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category');
    }
  }

  async function handleEditCategory(categoryId: string, newName: string) {
    if (!newName?.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    try {
      // Update the category name
      const { error: updateError } = await supabase
        .from('exercise_categories')
        .update({ name: newName.trim() })
        .eq('id', categoryId);

      if (updateError) {
        if (updateError.code === '23505') {
          setError('A category with this name already exists');
        } else {
          throw updateError;
        }
        return;
      }

      // Fetch the updated category
      const { data: updatedCategory, error: fetchError } = await supabase
        .from('exercise_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (fetchError) throw fetchError;

      if (updatedCategory) {
        setCategories(categories.map(c => c.id === categoryId ? updatedCategory : c));
      }
    } catch (error) {
      console.error('Error updating category:', error);
      setError('Failed to update category');
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exercise_categories')
        .insert({ 
          name: newCategoryName.trim(),
          user_id: user.id,
          is_default: false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setError('A category with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        setCategories([...categories, data]);
        setNewCategoryName('');
        setShowNewCategoryForm(false);
        setNewExercise(prev => ({ ...prev, category_id: data.id }));
        setSelectedCategory(data.id);
        setError('');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Error creating category. Please try again.');
    }
  }

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || exercise.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  async function handleExerciseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!newExercise.name.trim() || !newExercise.category_id) {
      setError('Please enter a name and select a category');
      return;
    }

    const existingExercise = exercises.find(
      ex => ex.name.toLowerCase() === newExercise.name.toLowerCase() &&
           (!editingExercise || ex.id !== editingExercise.id)
    );
    if (existingExercise) {
      setError('An exercise with this name already exists');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    try {
      if (editingExercise) {
        const { data, error } = await supabase
          .from('exercise_templates')
          .update({
            ...newExercise,
            category_id: newExercise.category_id ?? '',
            icon_name: selectedIcon.name
          })
          .eq('id', editingExercise.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setExercises(exercises.map(ex => ex.id === data.id ? data : ex));
        }
      } else {
        const { data, error } = await supabase
          .from('exercise_templates')
          .insert({
            ...newExercise,
            category_id: newExercise.category_id ?? '',
            is_custom: true,
            icon_name: selectedIcon.name,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setExercises([...exercises, data]);
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving exercise:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  }

  async function handleDeleteExercise(exercise: ExerciseTemplate) {
    if (!exercise.is_custom) {
      setError('Cannot delete default exercises');
      return;
    }
    if (!confirm('Are you sure you want to delete this exercise?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('exercise_templates')
        .delete()
        .eq('id', exercise.id);
      if (error) throw error;
      setExercises(exercises.filter(ex => ex.id !== exercise.id));
    } catch (error) {
      console.error('Error deleting exercise:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  }

  function handleEditExercise(exercise: ExerciseTemplate) {
    if (!exercise.is_custom) {
      setError('Cannot edit default exercises');
      return;
    }
    setEditingExercise(exercise);
    setNewExercise({
      name: exercise.name,
      category_id: exercise.category_id,
      default_sets: exercise.default_sets,
      default_reps: exercise.default_reps,
      default_distance: exercise.default_distance,
      default_duration: null, // <-- added default
      icon_name: exercise.icon_name || exerciseIcons[0].name,
      deleted_category_name: exercise.deleted_category_name ?? null
    });
    setSelectedIcon(findIconByName(exercise.icon_name || 'dumbbell'));
    setShowNewExerciseForm(true);
  }

  function resetForm() {
    setNewExercise({
      name: '',
      category_id: null,
      default_sets: null,
      default_reps: null,
      default_distance: null,
      default_duration: null,  // <-- reset duration as well
      icon_name: exerciseIcons[0].name,
      deleted_category_name: null
    });
    setSelectedIcon(exerciseIcons[0]);
    setEditingExercise(null);
    setShowNewExerciseForm(false);
    setError('');
  }

  const handleNumberChange = (
    field: 'default_sets' | 'default_reps' | 'default_distance' | 'default_duration',
    value: string
  ) => {
    const numValue = value === '' ? null : Number(value);
    setNewExercise(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const IconSelector = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Icon</h3>
            <button onClick={() => setShowIconSelector(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">×</button>
          </div>

        </div>
        <div className="p-4 overflow-y-auto grid grid-cols-4 gap-4">
          {filteredIcons.map(icon => (
            <button
              key={icon.name}
              onClick={() => {
                setSelectedIcon(icon);
                setNewExercise(prev => ({ ...prev, icon_name: icon.name }));
                setShowIconSelector(false);
              }}
              className={`p-4 rounded-lg border dark:border-gray-600 flex flex-col items-center gap-2 ${
                selectedIcon.name === icon.name
                  ? 'border-[#dbf111] bg-[#dbf111]/10'
                  : 'border-gray-200 dark:border-gray-600 hover:border-[#dbf111] dark:hover:border-[#dbf111]'
              }`}
            >
              <FontAwesomeIcon icon={icon.iconDef} className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              <span className="text-xs text-center text-gray-900 dark:text-white">{icon.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Exercise</h2>
            <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">×</button>
          </div>
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
            />
          </div>
          <div className="mb-2">
            <div className="flex justify-between items-center mb-6">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categories</label>
              <button
                onClick={() => setShowNewCategoryForm(true)}
                className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 text-sm flex items-center gap-1 underline"
              >
                <PlusIcon className="h-4 w-4" />
                Add Category
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
                <div key="all" className="relative flex flex-col items-start">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full whitespace-nowrap w-fit ${
                  !selectedCategory 
                    ? 'bg-[#dbf111] text-black' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                All
              </button>
              </div>
              {categories.map(category => (
                <div key={category.id} className="relative flex flex-col items-start">
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap ${
                      category.id === selectedCategory
                        ? 'bg-[#dbf111] text-black'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {category.name}
                    {!category.is_default && (
                      <span className="text-xs ml-1 opacity-80">(Custom)</span>
                    )}
                  </button>
                  {!category.is_default && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => {
                          const newName = prompt('Enter new category name:', category.name);
                          if (newName) handleEditCategory(category.id, newName);
                        }}
                        className="flex items-center p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        title="Edit category"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this category? Exercises will be assigned to "Uncategorized".')) {
                            handleDeleteCategory(category.id);
                          }
                        }}
                        className="flex items-center p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        title="Delete category"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {showNewCategoryForm && (
            <form onSubmit={handleAddCategory} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Category Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name..."
                  className="flex-1 px-3 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                  autoFocus
                />
                <button type="submit" className="px-3 py-1 bg-[#dbf111] text-black rounded hover:bg-[#c5d60f]">Add</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategoryForm(false);
                    setNewCategoryName('');
                  }}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-2">
            {filteredExercises.map(exercise => {
              const iconInfo = findIconByName(exercise.icon_name || 'dumbbell');
              return (
                <div
                  key={exercise.id}
                  className="w-full text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                >
                  <button
                    onClick={() => {
                      onSelect(exercise);
                      onClose();
                    }}
                    className="flex-1 flex items-center gap-3"
                  >
                    <FontAwesomeIcon icon={iconInfo.iconDef} className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    <div>
                      <span className="text-gray-900 dark:text-white">{exercise.name}</span>
                      {exercise.is_custom && <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Custom</span>}
                      {exercise.deleted_category_name && (
                        <span className="text-sm text-red-500 dark:text-red-400 ml-2">{exercise.deleted_category_name}</span>
                      )}
                    </div>
                  </button>
                  {exercise.is_custom && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditExercise(exercise)}
                        className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        title="Edit exercise"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExercise(exercise)}
                        className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        title="Delete exercise"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t dark:border-gray-700" ref={newExerciseFormRef}>
            {!showNewExerciseForm ? (
              <button
                onClick={() => setShowNewExerciseForm(true)}
                className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 text-sm flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Custom Exercise
              </button>
            ) : (
              <form onSubmit={handleExerciseSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New exercise name..."
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="flex-1 p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowIconSelector(true)}
                    className="p-2 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FontAwesomeIcon icon={selectedIcon.iconDef} className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                <select
                  value={newExercise.category_id || ''}
                  onChange={(e) =>
                    setNewExercise(prev => ({ ...prev, category_id: e.target.value || null }))
                  }
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                >
                  <option value="">Select category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Default Sets</label>
                    <input
                      type="number"
                      value={newExercise.default_sets ?? ''}
                      onChange={(e) => handleNumberChange('default_sets', e.target.value)}
                      min="1"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Default Reps</label>
                    <input
                      type="number"
                      value={newExercise.default_reps ?? ''}
                      onChange={(e) => handleNumberChange('default_reps', e.target.value)}
                      min="1"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Miles</label>
                    <input
                      type="number"
                      value={newExercise.default_distance ?? ''}
                      onChange={(e) => handleNumberChange('default_distance', e.target.value)}
                      min="0"
                      step="any"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Duration</label>
                    <input
                      type="number"
                      value={newExercise.default_duration ?? ''}
                      onChange={(e) => handleNumberChange('default_duration', e.target.value)}
                      min="0"
                      step="any"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#dbf111] text-black py-2 rounded hover:bg-[#c5d60f] flex items-center justify-center gap-2"
                  >
                    {editingExercise ? (
                      <>
                        <PencilIcon className="h-5 w-5" />
                        Update Exercise
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5" />
                        Add Custom Exercise
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      {showIconSelector && <IconSelector />}
    </div>
  );
}