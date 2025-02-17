import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconByName, exerciseIcons, ExerciseIcon } from '../lib/exercise-icons';
import { PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Database } from '../types/supabase';

type Category = Database['public']['Tables']['exercise_categories']['Row'];
type ExerciseTemplate = Database['public']['Tables']['exercise_templates']['Row'];

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseTemplate) => void;
  onClose: () => void;
}

export default function ExerciseSelector({ onSelect, onClose }: ExerciseSelectorProps) {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<ExerciseIcon>(exerciseIcons[0]);
  const [iconSearch, setIconSearch] = useState('');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newExercise, setNewExercise] = useState<Omit<ExerciseTemplate, 'id' | 'created_at' | 'user_id' | 'is_custom'>>({
    name: '',
    category_id: '',
    default_sets: null,
    default_reps: null,
    default_distance: null,
    icon_name: exerciseIcons[0].name
  });

  useEffect(() => {
    fetchCategories();
    fetchExercises();
  }, []);

  const filteredIcons = iconSearch
    ? exerciseIcons.filter(icon => 
        icon.name.toLowerCase().includes(iconSearch.toLowerCase()) ||
        icon.keywords.some(keyword => keyword.toLowerCase().includes(iconSearch.toLowerCase()))
      )
    : exerciseIcons;

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

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exercise_categories')
        .insert({ name: newCategoryName.trim() })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          alert('A category with this name already exists');
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
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category. Please try again.');
    }
  }

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || exercise.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  async function handleCustomExerciseSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newExercise.name.trim() || !newExercise.category_id) {
      alert('Please enter a name and select a category');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    const { data, error } = await supabase
      .from('exercise_templates')
      .insert({
        ...newExercise,
        user_id: user.id,
        is_custom: true,
        icon_name: selectedIcon.name
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating exercise:', error);
      alert('Error creating exercise');
      return;
    }

    if (data) {
      fetchExercises();
      
      setNewExercise({
        name: '',
        category_id: '',
        default_sets: null,
        default_reps: null,
        default_distance: null,
        icon_name: exerciseIcons[0].name
      });
      setSelectedIcon(exerciseIcons[0]);
    }
  }

  const handleNumberChange = (field: 'default_sets' | 'default_reps' | 'default_distance', value: string) => {
    const numValue = value === '' ? null : Number(value);
    setNewExercise(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const IconSelector = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Select Icon</h3>
            <button onClick={() => setShowIconSelector(false)} className="text-gray-500">×</button>
          </div>
          
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search icons..."
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-4 gap-4">
          {filteredIcons.map((icon) => (
            <button
              key={icon.name}
              onClick={() => {
                setSelectedIcon(icon);
                setNewExercise(prev => ({ ...prev, icon_name: icon.name }));
                setShowIconSelector(false);
              }}
              className={`p-4 rounded-lg border flex flex-col items-center gap-2 ${
                selectedIcon.name === icon.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <FontAwesomeIcon icon={icon.iconDef} className="h-6 w-6" />
              <span className="text-xs text-center">{icon.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Select Exercise</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
          
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
          </div>

          <div className="mb-2">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Categories</label>
              <button
                onClick={() => setShowNewCategoryForm(true)}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Category
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full whitespace-nowrap ${
                  !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap ${
                    category.id === selectedCategory
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {showNewCategoryForm && (
            <form onSubmit={handleAddCategory} className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Category Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name..."
                  className="flex-1 px-3 py-1 border rounded"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategoryForm(false);
                    setNewCategoryName('');
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-2">
            {filteredExercises.map((exercise) => {
              const iconInfo = findIconByName(exercise.icon_name || 'dumbbell');
              return (
                <button
                  key={exercise.id}
                  onClick={() => {
                    onSelect(exercise);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded hover:bg-gray-100 transition-colors flex items-center gap-3"
                >
                  <FontAwesomeIcon icon={iconInfo.iconDef} className="h-5 w-5 text-gray-600" />
                  <div className="flex-1">
                    <span>{exercise.name}</span>
                    {exercise.is_custom && (
                      <span className="text-sm text-gray-500 ml-2">Custom</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t">
            <form onSubmit={handleCustomExerciseSubmit} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New exercise name..."
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  className="flex-1 p-2 border rounded"
                />
                <button
                  type="button"
                  onClick={() => setShowIconSelector(true)}
                  className="p-2 border rounded hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={selectedIcon.iconDef} className="h-6 w-6" />
                </button>
              </div>
              
              <select
                value={newExercise.category_id}
                onChange={(e) => setNewExercise({ ...newExercise, category_id: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select category...</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Default Sets</label>
                  <input
                    type="number"
                    value={newExercise.default_sets ?? ''}
                    onChange={(e) => handleNumberChange('default_sets', e.target.value)}
                    min="1"
                    className="w-full p-2 border rounded"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Default Reps</label>
                  <input
                    type="number"
                    value={newExercise.default_reps ?? ''}
                    onChange={(e) => handleNumberChange('default_reps', e.target.value)}
                    min="1"
                    className="w-full p-2 border rounded"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Default Distance (mi)</label>
                  <input
                    type="number"
                    value={newExercise.default_distance ?? ''}
                    onChange={(e) => handleNumberChange('default_distance', e.target.value)}
                    min="0"
                    step="any"
                    className="w-full p-2 border rounded"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Custom Exercise
              </button>
            </form>
          </div>
        </div>
      </div>

      {showIconSelector && <IconSelector />}
    </div>
  );
}