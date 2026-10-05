import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '@/services/api/northwind/categoryApi'
import { northwindKeys } from './northwindKeys'

// 分類幾乎不會變，staleTime: Infinity 讓整個 App 只打一次
function useCategories() {
  return useQuery({
    queryKey: northwindKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: Infinity,
  })
}

export default useCategories
