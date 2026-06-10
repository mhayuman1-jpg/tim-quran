'use client';

import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function useNavigation() {
  const { data, error, isLoading } = useSWR('/api/website/navigation', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    staleTime: 300000,
  });
  return {
    items: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}

export function useSiswaList() {
  const { data, error, isLoading } = useSWR('/api/siswa/list', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    staleTime: 300000,
  });
  return {
    siswa: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}

export function useProfil() {
  const { data, error, isLoading } = useSWR('/api/website/profil', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    staleTime: 600000,
  });
  return {
    profil: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}

export function useKelasList() {
  const { data, error, isLoading } = useSWR('/api/kelas/list', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    staleTime: 300000,
  });
  return {
    kelas: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}
