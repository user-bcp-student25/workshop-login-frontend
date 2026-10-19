export interface Task {
  id?: number | string;
  status?: string;
  priority?: string | number;
  owner?: string;
  title?: string;
  description?: string;
  label?: string;
}